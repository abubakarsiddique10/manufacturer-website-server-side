const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
// middleware
app.use(cors());
app.use(express.json());



function varifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1gdp7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const toolsCollection = client.db('hardware-zone').collection('tools');

        const bookingCollection = client.db('hardware-zone').collection('booking');

        const reviewCollection = client.db('hardware-zone').collection('reviews');

        const profileCollection = client.db('hardware-zone').collection('profiles');

        const paymentCollection = client.db('hardware-zone').collection('payments');

        const newproductsCollection = client.db('hardware-zone').collection('new_products');


        // authentication

        app.post('/login', async (req, res) => {
            const email = req.body.email;
            const accessToken = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
                expiresIn: '15d'
            });
            res.send({ accessToken });
        })

        //payment method
        app.post('/create-payment-intent', async (req, res) => {
            const service = req.body;
            const price = service.price;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })

        // add tool product
        app.post('/tools', async (req, res) => {
            const product = req.body.product;
            const result = await toolsCollection.insertOne(product);
            res.send(result)
        })

        // get all tools products
        app.get('/tools', async (req, res) => {
            const query = {};
            const cursor = toolsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })

        // delete product
        app.delete('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await toolsCollection.deleteOne(filter);
            res.send(result);
        })

        // get one tool
        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await toolsCollection.findOne(query);
            res.send(result)
        });

        // available stock update
        app.patch('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const updateStock = req.body;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    available: updateStock.available,
                }
            };
            const availableStock = await toolsCollection.updateOne(filter, updateDoc);
            res.send(availableStock);
        });

        // set order details
        app.post('/booking', async (req, res) => {
            const order = req.body.bookingOrder;
            const result = await bookingCollection.insertOne(order);
        })

        // booked user orders
        app.get('/booking', varifyJWT, async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const user = bookingCollection.find(filter);
            const result = await user.toArray();
            res.send(result);
        });

        // get user order
        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollection.findOne(filter);
            res.send(result)
        })

        // get purchase all orders
        app.get('/booked', async (req, res) => {
            const query = {};
            const cursor = bookingCollection.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })

        // set admin role
        app.put('/booked', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email };
            const updateDoc = {
                $set: {
                    role: 'admin',
                }
            }
            const result = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // check admin
        app.get('/booked/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const user = await bookingCollection.findOne(filter);
            const isAdmin = user?.role == "admin";
            res.send({ admin: isAdmin })
        })

        // get users review
        app.post('/reviews', async (req, res) => {
            const review = req.body.review;
            const result = await reviewCollection.insertOne(review);
            res.send(result)
        });

        // find users reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        // get users profile
        app.put('/profiles', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email }
            const profile = req.body.profile;
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    phone: profile.phone,
                    image: profile.image,
                    linkdin: profile.linkdin,
                    location: profile.location,
                    education: profile.education,
                }
            }
            const result = await profileCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        // find user profile
        app.get('/profiles', async (req, res) => {
            const email = req.query.email;
            const filter = { email: email }
            const result = await profileCollection.findOne(filter);
            res.send(result)
        })

        // cancel order 
        app.delete('/booked/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await bookingCollection.deleteOne(filter);
            res.send(result);
        });

        // update paid user
        app.patch('/booked/:id', async (req, res) => {
            const id = req.params.id;
            const paymentDetails = req.body.payment;
            const filter = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    paid: true
                }
            }
            const updateBooked = await bookingCollection.updateOne(filter, updateDoc);
            res.send(updateBooked);
            const seveDetails = await paymentCollection.insertOne(paymentDetails);
        });

        // get new products
        app.get('/newproducts', async (req, res) => {
            const query = {};
            const cursor = newproductsCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })
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