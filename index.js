const express = require('express')
const axios = require('axios')
const app = express()

const port = 3000

const baseRequestUri = "https://steamcommunity.com/market/priceoverview/?appid=730&currency=3&market_hash_name=";

var dataMap = new Map();

/// Sample value in Map:

/// {
///     data: 1.75,
///     timestamp: 235335353
/// }

async function getDataFromSteam(name) {
    let url = baseRequestUri + name;
    try {
        let resp = await axios.get(url);
        let price = resp.data.lowest_price;
        console.log(price);
        return price;
    } catch (e) {
        return 0;
    }
}

function createMapObject(value) {
    return {
        data: value,
        timestamp: Date.now()
    }
}

function createReturnObject(price) {
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


    console.log(req.params);
    var name = req.params.itemname;
    console.log(name);

    if (name === null || name === undefined) {
        console.log("Undefined Name...")
        res.send(createReturnObject(0))
    }

    let mapValue = dataMap.get(name)
    if (mapValue !== undefined) {
        if (mapValue.timestamp !== null) {
            if (mapValue.timestamp + 180000 > Date.now()) {
                console.log("Sending cache result...")
                res.send(createReturnObject(mapValue.data))
                next()
                return;
            }
        }
    }

    let price = await getDataFromSteam(name);

    let priceNum = parseFloat(price.toString().replace(',', '.'));

    console.log(priceNum)

    if (priceNum !== null || priceNum !== undefined) {
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