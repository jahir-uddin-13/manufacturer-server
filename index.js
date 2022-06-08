const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const res = require('express/lib/response');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



//db connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xmcl5.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}


async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('assign12').collection('parts');
        const revCollection = client.db('assign12').collection('review');
        const orderCollection = client.db('assign12').collection('orders');
        const usersCollection = client.db('assign12').collection('users');
        const userCollection = client.db('assign12').collection('user');

        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
              next();
            }
            else {
              res.status(403).send({ message: 'forbidden' });
            }
          }

        app.get('/bikes', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query);
            const bikes = await cursor.toArray();
            res.send(bikes);
        });
        app.get('/use', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });
        app.get('/allorder', async (req, res) => {
            const orders = await orderCollection.find().toArray();
            res.send(orders);
        });
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
          })
        app.put('/user/admin/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
              $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
          })
        // get all reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = revCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });
        //get order by user
        app.get('/order/:email', async (req, res) => {
            const mail = req.params.email
            const query = { email: mail };
            const cursor = orderCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/inventory/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const bike = await partsCollection.findOne(query);
            res.send(bike);
        });

        app.post('/bikes', async (req, res) => {
            const newBike = req.body;
            const result = await partsCollection.insertOne(newBike);
            res.send(result);
        });
        //post review
        app.post('/review', async (req, res) => {
            const newRev = req.body;
            const result = await revCollection.insertOne(newRev);
            res.send(result);
        });
        //post orders
        app.post('/orders', async (req, res) => {
            const newOrder = req.body;
            const result = await orderCollection.insertOne(newOrder);
            res.send(result);
        });
        //update parts
        app.put('/bikes/:id', async (req, res) => {
            const id = req.params.id;
            const updatedElement = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    stock: updatedElement.result
                }
            };
            const result = await partsCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })






        //entry user
        app.put('/user/:email', async (req, res) => {
            const mail = req.params.email;
            const updatedElement = req.body;
            const filter = { email: mail };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    email: updatedElement.email,
                }
            };
            const result = await userCollection.updateOne(filter, updatedDoc, options);
            const token = jwt.sign({ email: mail }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ result, token });
        })
        //update profile
        app.put('/users/:email', async (req, res) => {
            const mail = req.params.email;
            const updatedElement = req.body;
            const filter = { email: mail };
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    firstName: updatedElement.firstName,
                    lastName: updatedElement.lastName,
                    Education: updatedElement.Education,
                    city: updatedElement.city,
                    dist: updatedElement.dist,
                    phone: updatedElement.phone,
                    gender: updatedElement.gender

                }
            };
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        })
        //delete parts
        app.delete('/bikes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await partsCollection.deleteOne(query);
            res.send(result);
        });
        //remove user
        app.delete('/remove/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });
        //delete order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });
        //delete order or cancel order
        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        });
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Running genius server');
})

// port listening
app.listen(port, () => {
    console.log('listening to port', port);
})