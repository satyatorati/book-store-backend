const express = require("express");
const app = express();
const cors = require("cors");

const mongoose = require("mongoose");
const port = process.env.PORT || 3000;
require('dotenv').config()

// middleware
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173','https://book-store-flax.vercel.app'],
    credentials: true
}))


// routes
const bookRoutes = require('./src/books/book.route');
const orderRoutes = require("./src/orders/order.route")


const userRoutes = require("./src/users/user.route")

const adminRoutes = require("./src/stats/admin.stats")

app.use("/api/admin", adminRoutes)

app.use("/api/auth", userRoutes)

app.use("/api/orders", orderRoutes)

app.use("/api/books", bookRoutes)




async function main() {
  await mongoose.connect(process.env.Db_URL );
    app.get('/', (req, res) => {
    res.send('Book store server ')
    })
}

main().then(()=>console.log("mongo DB connection succesfull")).catch(err => console.log(err));
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})