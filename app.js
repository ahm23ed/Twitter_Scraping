
import puppeteer from 'puppeteer' 
import * as cheerio from 'cheerio' 

// Utility function to introduce a delay (pause) for the specified number of milliseconds
async function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// Function to scroll down the page with a specified timeout

async function scrollPageWithTimeout(page, timeout) {
    const initialHeight = await page.evaluate(() => document.body.scrollHeight) 
    let pastHeight = initialHeight
    let startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {  
        await page.evaluate(() => window.scrollBy(0, window.innerHeight)) 
        await delay(2000)  // Pause for 2 seconds to allow new content to load

        const newHeight = await page.evaluate(() => document.body.scrollHeight)  
        if (newHeight === pastHeight) {  // If no new content is loaded, exit the loop
            break
        }
        pastHeight = newHeight  // Update the past height for comparison
    }
}

// Function to fetch ticker symbols (e.g. stock symbols like $AAPL) from a Twitter account's tweets

async function fetchTwitterTickerCounts(tw_Account) {
    const browser = await puppeteer.launch({
        headless: true
    })
    const page = await browser.newPage()  
    try {
        // Navigate to the Twitter account's page
        await page.goto(`https://twitter.com/${tw_Account}`, 
            { waitUntil: 'domcontentloaded', timeout: 60000 }) 
        console.log(`Fetching tweets from @${tw_Account}`)
        
        await scrollPageWithTimeout(page, 60000)  

        const html = await page.content()  // Get the HTML content of the page
        const $ = cheerio.load(html)  
        const tweets = $('article').map((_, el) => $(el).text()).get()  
        
        const tickerRegex = /\$\w{3,4}/g  // Regex to match ticker symbols (e.g. $AAPL)
        const tickerC = {}  

        // Loop through each tweet and find ticker symbols
        for (let tweet of tweets) {
            const matches = tweet.match(tickerRegex)  
            if (matches) {
                for (let ticker of matches) {
                    tickerC[ticker] = (tickerC[ticker] || 0) + 1  
                }
            }
        }

        await browser.close()  
        return tickerC  // Return the count of ticker symbols
    } catch (error) {
        console.log(error)  
        await browser.close()  
        return {}  
    }
}

// Main function that orchestrates the scraping process
async function main() {
    const twitterAccounts = [
        'Mr_Derivatives', 'warrior_0719', 'allstarcharts',
        'yuriymatso', 'TriggerTrades', 'AdamMancini4',
        'CordovaTrades', 'Barchart', 'RoyLMattox'
    ]  // List of Twitter accounts to scrape

    const startPeriodic = 15 * 60 * 1000  // Scraping interval of 15 minutes (in milliseconds)
    const startTime = new Date()  

    // Function to fetch ticker counts from each account and log the results
    async function fetchAndLog() {
        const overallResults = {}  
        for (const account of twitterAccounts) {
            console.log(`Scraping account: @${account}`)  
            const results = await fetchTwitterTickerCounts(account)  // Fetch ticker counts for the account
            
            // Aggregate the ticker counts across all accounts
            for (const [ticker, count] of Object.entries(results)) {
                overallResults[ticker] = (overallResults[ticker] || 0) + count
            }
        }

        const timeSpent = Math.round((new Date() - startTime) / 60000)  
        console.log(`\nData collected after ${timeSpent} minutes:\n`)
        
        
        for (const [ticker, count] of Object.entries(overallResults)) {
            console.log(`'${ticker}' mentioned '${count}' times`)
        }
    }

    await fetchAndLog()  

    // Set up a periodic scraping session that runs every 15 minutes
    setInterval(async () => {
        console.log(`\nNext scrape session will begin in ${startPeriodic / 60000} minutes.\n`)
        await fetchAndLog()  
    }, startPeriodic)
}


main()


