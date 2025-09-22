import { pythClient } from "../pyth/client"

async function searchGME() {
    try {
        console.log("Searching for GameStop (GME) price feeds...")
        const feeds = await pythClient.searchPriceFeeds("GME")
        
        if (feeds.length > 0) {
            console.log(`Found ${feeds.length} GME-related feeds:`)
            feeds.forEach(feed => {
                console.log(`  - ${feed.attributes.symbol}: ${feed.attributes.description}`)
                console.log(`    Feed ID: ${feed.id}`)
            })
        } else {
            console.log("No GME feeds found, trying broader search...")
            const equityFeeds = await pythClient.getPriceFeedMetadata()
            const gmeFeeds = equityFeeds.filter(feed => 
                feed.attributes.symbol?.includes("GME") ||
                feed.attributes.description?.toLowerCase().includes("gamestop")
            )
            
            if (gmeFeeds.length > 0) {
                console.log(`Found ${gmeFeeds.length} GME-related feeds:`)
                gmeFeeds.forEach(feed => {
                    console.log(`  - ${feed.attributes.symbol}: ${feed.attributes.description}`)
                    console.log(`    Feed ID: ${feed.id}`)
                })
            } else {
                console.log("No GameStop feeds found in entire feed list")
            }
        }
    } catch (error) {
        console.error("Error searching for GME:", error)
    }
}

searchGME()