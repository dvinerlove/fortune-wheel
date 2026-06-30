// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Helper to normalize strings for comparison (ignore case, punctuation, extra spaces)
function normalizeString(s: string): string {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // remove punctuation and symbols
    .replace(/\s+/g, ' ') // replace multiple spaces with single
    .trim();
}

// Helper to transliterate Russian to Latin characters
function transliterateRussian(text: string): string {
  const cyrillicMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e',
    'ю': 'yu', 'я': 'ya', 'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D',
    'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K',
    'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S',
    'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'Kh', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh',
    'Щ': 'Shch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  };
  
  return text.split('').map(char => cyrillicMap[char] || char).join('');
}

// Helper to get steam price
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
    console.log("Searching for:", query);
    // Try multiple versions of the query
    const transliterated = transliterateRussian(query);
    const searchQueries = [
      query,
      query.substring(0, 50),
      query.split(' ').slice(0, 3).join(' '),
      transliterated,
      transliterated.substring(0, 50),
      transliterated.split(' ').slice(0, 3).join(' '),
      query.replace(/[^a-zA-Z0-9 ]/g, ''), // Also try removing all non-alphanumeric
      transliterated.replace(/[^a-zA-Z0-9 ]/g, '')
    ].filter(q => q.length > 0);
    
    let allResults: any[] = [];
    
    // Try all search methods in order
    for (const q of searchQueries) {
      // 1. Steam Community Search
      try {
        const url = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(q)}?l=russian`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("Community search results:", data);
        if (data && Array.isArray(data)) {
          allResults = allResults.concat(data);
          if (data.length > 0) break; // If we get results, stop trying this query
        }
      } catch (e) { console.log("Community search error:", e); }
      
      // 2. Steam Store Suggest API
      try {
        const url = `https://store.steampowered.com/search/suggest?term=${encodeURIComponent(q)}&f=games&cc=RU&realm=1`;
        const response = await fetch(url);
        if (response.ok) {
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            console.log("Store suggest results:", data);
            if (data && Array.isArray(data) && data.length > 0) {
              for (const item of data) {
                if (item && item.appid) {
                  allResults.push({ appid: item.appid, name: item.name || item.label || '' });
                }
              }
              if (allResults.length > 0) break;
            }
          } catch (e) { console.log("Store suggest parse error:", e); }
        }
      } catch (e) { console.log("Store suggest error:", e); }
      
      // 3. Steam Store Search Page (parse HTML)
      try {
        const url = `https://store.steampowered.com/search/?term=${encodeURIComponent(q)}&cc=RU&supportedlang=russian`;
        const response = await fetch(url);
        if (response.ok) {
          const html = await response.text();
          const appIdRegex = /data-ds-appid="(\d+)"/g;
          const nameRegex = /<span class="title">([^<]+)<\/span>/g;
          let match;
          let nameMatch;
          const apps = [];
          let index = 0;
          while ((match = appIdRegex.exec(html)) !== null && index < 10) {
            nameRegex.lastIndex = match.index - 500; // Look back a bit for the name
            nameMatch = nameRegex.exec(html);
            if (nameMatch) {
              apps.push({ appid: parseInt(match[1]), name: nameMatch[1] });
              index++;
            }
          }
          console.log("Store page results:", apps);
          if (apps.length > 0) {
            allResults = allResults.concat(apps);
            break;
          }
        }
      } catch (e) { console.log("Store page error:", e); }
    }
    
    // Deduplicate results by appId
    const uniqueResults: any[] = [];
    const seenAppIds = new Set();
    for (const item of allResults) {
      if (!seenAppIds.has(item.appid)) {
        seenAppIds.add(item.appid);
        uniqueResults.push(item);
      }
    }
    
    console.log("Final search results:", uniqueResults);
    
    return uniqueResults.slice(0, 15).map((item: any) => ({
      appId: item.appid,
      name: item.name,
      // Use Akamai CDN instead of Cloudflare to avoid ORB blocking
      icon: item.img_icon_url 
        ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${item.appid}/${item.img_icon_url}.jpg` 
        : `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.appid}/header.jpg`
    }));
  } catch (error) {
    console.error("Steam search error:", error);
    return [];
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
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
    
    // Health check - handle ANY path that might be a health check
    if (
      pathname === "/" || 
      pathname === "/health" || 
      pathname === "/api/health" ||
      pathname.includes("health")
    ) {
      const { data, error } = await supabase.from("shares").select("id").limit(1);
      
      if (error) {
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
      if (error) { /* handle error */ }
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get mapping suggestions (most used + search results
    if (req.method === "GET" && (pathname.startsWith("/api/mappings/suggest") || pathname.startsWith("/mappings/suggest"))) {
      const url2 = new URL(req.url);
      const gameName = decodeURIComponent(url2.searchParams.get("gameName") || "");
      const normalizedGameName = normalizeString(gameName);
      
      // First get exact existing mapping
      let { data: existingMapping, error: mappingErr } = await supabase
        .from("game_mappings")
        .select("*")
        .eq("game_name", gameName)
        .maybeSingle();

      // If no exact match, try all game_mappings and find best match by normalized string
      if (!existingMapping) {
        const { data: allMappings } = await supabase.from("game_mappings").select("*").limit(1000);
        if (allMappings && allMappings.length > 0) {
          existingMapping = allMappings.find(m => normalizeString(m.game_name) === normalizedGameName);
        }
      }

      // Then search steam search results
      const searchResults = await searchSteamGames(gameName);

      // Then get most used mappings: first exact, then all mappings with normalized match
      let { data: usageData } = await supabase
        .from("game_mapping_usage")
        .select("app_id, count")
        .eq("game_name", gameName)
        .order("count", { ascending: false });

      if (!usageData || usageData.length === 0) {
        // Get all usage data and find matches with normalized game name
        const { data: allUsage } = await supabase.from("game_mapping_usage").select("*").limit(1000);
        if (allUsage && allUsage.length > 0) {
          usageData = allUsage
            .filter(u => normalizeString(u.game_name) === normalizedGameName)
            .sort((a, b) => b.count - a.count);
        }
      }

      return new Response(
        JSON.stringify({
          existing: existingMapping,
          search: searchResults,
          mostUsed: usageData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save game mapping (with usage tracking)
    if (req.method === "POST" && (pathname === "/api/mappings" || pathname === "/mappings")) {
      const { gameName, appId } = await req.json();
      const decodedName = decodeURIComponent(gameName);

      // Upsert mapping - specify onConflict for unique key!
      const { error: upsertError } = await supabase
        .from("game_mappings")
        .upsert({ game_name: decodedName, app_id: appId, updated_at: new Date().toISOString() }, { onConflict: "game_name" });
      if (upsertError) throw upsertError;

      // Increment usage count - correct supabase syntax!
      try {
        // First try to increment
        const { data, error } = await supabase
          .from("game_mapping_usage")
          .select("*")
          .eq("game_name", decodedName)
          .eq("app_id", appId)
          .maybeSingle();

        if (!error && data) {
          // If exists, update
          await supabase
            .from("game_mapping_usage")
            .update({ count: (data as any).count + 1, updated_at: new Date().toISOString() })
            .eq("game_name", decodedName)
            .eq("app_id", appId);
        } else {
          // Not exists, insert!
          await supabase
            .from("game_mapping_usage")
            .insert({ game_name: decodedName, app_id: appId, count: 1, updated_at: new Date().toISOString() });
        }
      } catch (usageErr) {
        console.error("Usage count error:", usageErr);
        // Don't fail the whole request on usage error!
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create share
    if (req.method === "POST" && (pathname === "/shares" || pathname === "/api/shares")) {
      try {
        const body = await req.json();
        const shareData = body.state || body.data;

        if (!shareData) {
          return new Response(
            JSON.stringify({ error: "Missing share data (state or data field required)" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Generate a hash of the share data
        const shareDataString = JSON.stringify(shareData);
        const encoder = new TextEncoder();
        const data = encoder.encode(shareDataString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Check if a share with this hash already exists
        const { data: existingShare, error: findError } = await supabase
          .from("shares")
          .select("id")
          .eq("hash", hashHex)
          .maybeSingle();

        if (findError) {
          console.error("Error finding existing share:", findError);
          throw findError;
        }

        if (existingShare) {
          return new Response(
            JSON.stringify({ shareId: existingShare.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If not, create a new one
        const id = Math.random().toString(36).substring(2, 8);
        const { error } = await supabase.from("shares").insert({ id, data: shareData, hash: hashHex });
        
        if (error) {
          console.error("Error inserting share:", error);
          throw error;
        }

        return new Response(
          JSON.stringify({ shareId: id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error: any) {
        console.error("Create share error:", error);
        return new Response(
          JSON.stringify({ error: error.message || "Failed to create share" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
      const force = url.searchParams.get("force") === "1"; // New: force refresh
      const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();

      // Check Supabase first, but re-fetch if:
      // 1) force=1
      // 2) price or original_price is null
      // 3) cache is older than 4 days
      const { data: existingPrice, error: selectError } = await supabase
        .from("game_prices")
        .select("*")
        .eq("app_id", appId)
        .eq("region", region)
        .gte("last_updated", fourDaysAgo)
        .single();

      const useCache = !force && !selectError && existingPrice && existingPrice.price != null && existingPrice.original_price != null;
      if (useCache) {
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
          original_price: priceData.originalPrice, // fixed: use originalPrice
          currency: priceData.currency,
          region: region,
          last_updated: new Date().toISOString()
        }, { onConflict: "app_id, region" });
      if (upsertError) console.error("Price upsert error:", upsertError);

      return new Response(
        JSON.stringify(priceData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Preload multiple prices
    if (req.method === "POST" && (pathname === "/prices/preload" || pathname === "/api/prices/preload")) {
      const { appIds, region = "kz", force = false } = await req.json(); // Added force
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
        const useCache = !force && !selectError && existingPrice && existingPrice.price != null && existingPrice.original_price != null;
        if (useCache) {
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
                original_price: priceData.originalPrice,
                currency: priceData.currency,
                region: region,
                last_updated: new Date().toISOString()
              }, { onConflict: "app_id, region" });
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
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
