// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Hello from Functions!");

// Initialize Supabase client
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
console.log("SUPABASE_URL is set:", !!SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY is set:", !!SUPABASE_SERVICE_ROLE_KEY);

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
    originalPrice: priceData.initial / 100,
    currency: priceData.currency
  };
}

// Helper to search Steam for games
async function searchSteamGames(query: string) {
  try {
    const url = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.slice(0, 10).map((item: any) => ({
      appId: item.appid,
      name: item.name,
      icon: `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${item.appid}/${item.img_icon_url}.jpg`
    }));
  } catch (error) {
    console.error("Steam search failed:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  console.log("=== NEW REQUEST ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    console.log("Full pathname:", url.pathname);
    
    // Let's extract the path after the function name
    // Possible function URLs:
    // 1. https://tyxlbygyynhdxcexgaxf.functions.supabase.co/fortune-wheel
    // 2. https://tyxlbygyynhdxcexgaxf.supabase.co/functions/v1/fortune-wheel
    // So let's remove any prefix that includes "fortune-wheel"
    let pathname = url.pathname;
    
    // Find the position of "fortune-wheel" in the path
    const functionName = "fortune-wheel";
    const idx = pathname.indexOf(functionName);
    if (idx !== -1) {
      // Take everything after "fortune-wheel"
      pathname = pathname.slice(idx + functionName.length) || "/";
    }
    
    console.log("Final processed pathname:", pathname);

    // Health check - handle ANY path that might be a health check
    if (
      pathname === "/" || 
      pathname === "/health" || 
      pathname === "/api/health" ||
      pathname.includes("health")
    ) {
      console.log("RUNNING HEALTH CHECK");
      const { data, error } = await supabase.from("shares").select("id").limit(1);
      console.log("Health check query - data:", data, "error:", error);
      
      if (error) {
        console.error("Health check ERROR:", error);
        return new Response(
          JSON.stringify({ status: "error", error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ status: "ok", database: "connected", supabaseUrl: SUPABASE_URL }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Steam search
    if (req.method === "GET" && (pathname === "/api/steam/search" || pathname === "/steam/search")) {
      const url = new URL(req.url);
      const query = url.searchParams.get("q") || "";
      const results = await searchSteamGames(query);
      return new Response(
        JSON.stringify(results),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get game mapping
    if (req.method === "GET" && (pathname === "/api/mappings" || pathname === "/mappings")) {
      const url = new URL(req.url);
      const gameName = url.searchParams.get("gameName") || "";
      const decodedName = decodeURIComponent(gameName);
      const { data, error } = await supabase.from("game_mappings").select("*").eq("game_name", decodedName).maybeSingle();
      if (error) console.error("Get mapping error:", error);
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save game mapping
    if (req.method === "POST" && (pathname === "/api/mappings" || pathname === "/mappings")) {
      const { gameName, appId } = await req.json();
      const decodedName = decodeURIComponent(gameName);
      const { error } = await supabase.from("game_mappings").upsert({ game_name: decodedName, app_id: appId, updated_at: new Date().toISOString() });
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create share
    if (req.method === "POST" && (pathname === "/shares" || pathname === "/api/shares")) {
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
    if (req.method === "GET" && (pathname.startsWith("/shares/") || pathname.startsWith("/api/shares/"))) {
      const id = pathname.split("/").pop() || "";
      const { data, error } = await supabase.from("shares").select("data").eq("id", id).single();
      if (error) throw error;
      return new Response(
        JSON.stringify(data.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get game price
    if (req.method === "GET" && (pathname.startsWith("/price/") || pathname.startsWith("/api/price/"))) {
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
    if (req.method === "POST" && (pathname === "/prices/preload" || pathname === "/api/prices/preload")) {
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

    console.log("NO ROUTE MATCHED");
    return new Response(
      JSON.stringify({ 
        error: "Not found", 
        pathname: pathname, 
        fullPath: url.pathname,
        availableEndpoints: [
          "GET /",
          "GET /health",
          "GET /api/health",
          "POST /shares",
          "POST /api/shares",
          "GET /shares/:id",
          "GET /api/shares/:id"
        ]
      }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("=== FUNCTION ERROR ===");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
