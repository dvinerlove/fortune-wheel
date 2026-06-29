// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from Functions!");

// Initialize Supabase client
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper to get Steam price
async function fetchSteamPriceFromAPI(appId: string, region: string) {
  const regionMap: Record<string, string> = {
    kz: "kz", ru: "ru", us: "us", eu: "eu"
  };
  const cc = regionMap[region] || "kz";
  
  let url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cc}&filters=price_overview`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (!data[appId]?.success) return null;
  
  const priceData = data[appId].data?.price_overview;
  if (!priceData) return null;
  
  return {
    price: priceData.final / 100,
    discount: priceData.discount_percent,
    original_price: priceData.initial / 100,
    currency: priceData.currency
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace("/functions/v1/fortune-wheel", "");

    // Health check
    if (pathname === "/api/health" || pathname === "/health") {
      const { error } = await supabase.from("shares").select("id").limit(1);
      if (error) throw error;
      return new Response(
        JSON.stringify({ status: "ok", database: "connected", supabaseUrl: SUPABASE_URL }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create share
    if (req.method === "POST" && (pathname === "/api/shares" || pathname === "/shares")) {
      const { data } = await req.json();
      const id = Math.random().toString(36).substring(2, 8);
      const { error } = await supabase.from("shares").insert({ id, data });
      if (error) throw error;
      return new Response(
        JSON.stringify({ id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get share
    if (req.method === "GET" && pathname.startsWith("/api/shares/")) {
      const id = pathname.split("/").pop() || "";
      const { data, error } = await supabase.from("shares").select("data").eq("id", id).single();
      if (error) throw error;
      return new Response(
        JSON.stringify(data.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get game price
    if (req.method === "GET" && pathname.startsWith("/api/price/")) {
      const appId = pathname.split("/").pop() || "";
      const region = url.searchParams.get("region") || "kz";
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

      // Check Supabase first
      const { data: existingPrice, error: selectError } = await supabase
        .from("game_prices")
        .select("*")
        .eq("app_id", appId)
        .eq("region", region)
        .gte("last_updated", fourDaysAgo)
        .single();

      if (!selectError && existingPrice) {
        return new Response(
          JSON.stringify({
            price: existingPrice.price,
            discount: existingPrice.discount,
            originalPrice: existingPrice.original_price
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch new price
      const priceData = await fetchSteamPriceFromAPI(appId, region);
      if (!priceData) {
        return new Response(
          JSON.stringify({ error: "Price not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update Supabase
      const { error: upsertError } = await supabase
        .from("game_prices")
        .upsert({
          app_id: appId,
          price: priceData.price,
          discount: priceData.discount,
          original_price: priceData.original_price,
          currency: priceData.currency,
          region: region,
          last_updated: new Date().toISOString()
        });
      if (upsertError) console.error("Upsert error:", upsertError);

      return new Response(
        JSON.stringify(priceData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preload multiple prices
    if (req.method === "POST" && (pathname === "/api/prices/preload" || pathname === "/prices/preload")) {
      const { appIds, region = "kz" } = await req.json();
      const results = [];
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

      for (const appId of appIds) {
        // Check Supabase first
        const { data: existingPrice, error: selectError } = await supabase
          .from("game_prices")
          .select("*")
          .eq("app_id", appId)
          .eq("region", region)
          .gte("last_updated", fourDaysAgo)
          .single();

        let priceData = null;
        if (!selectError && existingPrice) {
          priceData = {
            price: existingPrice.price,
            discount: existingPrice.discount,
            originalPrice: existingPrice.original_price
          };
        }

        // If no cache or expired, fetch from API
        if (!priceData) {
          priceData = await fetchSteamPriceFromAPI(appId, region);
          if (priceData) {
            const { error: upsertError } = await supabase
              .from("game_prices")
              .upsert({
                app_id: appId,
                price: priceData.price,
                discount: priceData.discount,
                original_price: priceData.original_price,
                currency: priceData.currency,
                region: region,
                last_updated: new Date().toISOString()
              });
            if (upsertError) console.error("Upsert error:", upsertError);
          }
        }

        results.push({ appId, data: priceData });
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
