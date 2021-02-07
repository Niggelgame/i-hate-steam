import express from 'express';
import axios from 'axios';
const app = express()

const port = 3000

const baseRequestUri = "https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=";

interface MapEntry {
    data: number,
    timestamp: number
}

function Sleep(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

const dataMap = new Map<string, MapEntry>();

/// Sample value in Map:

/// {
///     data: 1.75,
///     timestamp: 235335353
/// }

async function getDataFromSteam(name: string, requestamount: number = 0) : Promise<number> {
    const url = baseRequestUri + name;
    try {
        const resp = await axios.get(url, {
            validateStatus: (status) => {
                return status >= 200 && status < 300 || status === 500;
            }
        });

        // Check for successful Steam response
        const successful = resp.data.success;
        if(!successful) {
            return -1;
        }
        const price = resp.data.lowest_price;
        return price;
    } catch (e) {
        if(requestamount > 5) {
            return -1
        }
        await Sleep(5000)
        return getDataFromSteam(name, requestamount+=1);
    }
}

function createMapObject(value: number) : MapEntry {
    return {
        data: value,
        timestamp: Date.now()
    }
}

function createReturnObject(price: number) {
    return {
        value: price
    }
}

app.get('/api/', async(req, res, next) => {
    console.log(`Someone us uhhhh ${req.headers['x-forwarded-for'] || req.connection.remoteAddress}`)
    res.send({
        value: 0,
        message: 'Welcome to the API - do not use me if not explicitly told to do so.'
    })
    next()
})

app.get('/api/:itemname', async(req, res, next) => {
    const name = req.params.itemname;

    if (name === null || name === undefined) {
        console.log("Request with undefined Name...")
        res.send(createReturnObject(0))
    }

    const mapValue = dataMap.get(name)
    if (mapValue !== undefined) {
        if (mapValue.timestamp !== null) {
            if (mapValue.timestamp + 180000 > Date.now()) {
                console.log(`Sending cache result for ${name}... ${mapValue.data}`)
                res.send(createReturnObject(mapValue.data))
                next()
                return;
            }
        }
    }

    const price = await getDataFromSteam(name);

    const priceNum = parseFloat(price.toString().replace(',', '.'));

    console.log(`Request for ${name} resolved into ${priceNum}`)

    if (priceNum !== null && priceNum !== undefined) {
        dataMap.set(name, createMapObject(priceNum));

        res.send(createReturnObject(priceNum))
        next()
    } else {
        res.send(createReturnObject(0))
    }
})

app.listen(port, () => {
    console.log(`Running Steam Api on port ${port}`)
})