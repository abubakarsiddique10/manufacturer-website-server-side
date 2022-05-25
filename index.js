const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gdp7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('hardware-zone').collection('tools');

        // get all tools
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // get one tool
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.findOne(query);
            res.send(result)
        });

        // available stock update
        /* app.patch('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const available = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    available: available,
                }
            };
            const updateStock = await toolsCollection.updateOne(filter, updateDoc);
            res.send(updateStock);
            console.log(updateDoc)
        }) */

    }
    finally {

    }
}
run().catch(console.dir)





app.get('/', (req, res) => {
    res.send('server running');
})
app.listen(port, () => {
    console.log('app listen', port);
})