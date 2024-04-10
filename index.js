require('dotenv').config();

const PORT =process.env.PORT|| 8000;

const express = require("express");
const app = express();

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());
console.log("DB_CONNECTION_STRING:", process.env.DB_CONNECTION_STRING);
console.log("JWT_SECRET:", process.env.JWT_SECRET);

// database connection with MongoDB
mongoose
  .connect(
    process.env.DB_CONNECTION_STRING,

    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => {
    console.log("Connected to MongoDB Atlas");

    // Start the server after successful MongoDB connection
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB Atlas:", error);
  });

// API Creation
app.get("/", (req, res) => {
  res.send("Hello from Server");
});
//Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({
  storage: storage,
});
//Create uplaod endpoint  for image upload

app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${PORT}/images/${req.file.filename}`,
  });
});

// Create Schema to upload product
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
  avilable: {
    type: Boolean,
    default: true,
  },
});
app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log("product======>", product);

  await product.save();
  console.log("Save!");
  res.json({
    success: true,
    name: req.body.name,
  });
});
//Shema creating for User model
const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});
//Creating endpoint registering

app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res
      .status(400)
      .json({ success: false, error: "Exiting email user found " });
  }
  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();
  const data = {
    user: {
      id: user.id,
    },
  };
  const token = jwt.sign(data, process.env.JWT_SECRET);
  res.json({ success: true, token });
});

//create endpoint for user login
app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, error: "Wrong Password" });
    }
  } else {
    res.json({ success: false, error: "Wrong Email Id " });
  }
});

//create api delete the products

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed!");
  res.json({
    success: true,
    name: req.body.name,
  });
});

//creating API to getting all products

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("All Product Fetch: The size of", products.length);
  res.send(products);
});

//creating endpoint for new colllections


app.get('/newcollection',async(req,res)=>{
  try {
    let products=await Product.find({});
    let newcollection=products.slice(1).slice(-10);
    console.log("newwww", newcollection);
    res.status(200).json(newcollection);
  } catch (error) {
    console.error("Error fetching data",error); 
    res.status(500).json({error:"Internal server Error"});
  }
})
//creating endpoint for popular in women section
app.get('/popularinwomen',async(req,res)=>{
  try {
    let products=await Product.find({category:"women"});
    let popularinwomen=products.slice(0,4);
    // console.log(popularinwomen,"popularinwomen fetch");
    res.send(popularinwomen);
  } catch (error) {
    console.error("Error Fetching data",error);
    res.status(500).json({error:"Internal server Error"});
  }


})

//creating middleware to fetch user

const fetchUser=async(req,res,next)=>{
  const token=req.header('auth-token');
  if(!token){
    res.status(401).send({error:"Please authenticated using valid token!"})
  }else{
    try {
      const data=jwt.verify(token,process.env.JWT_SECRET);
      req.user=data.user;
      next();
      
    } catch (error) {
      console.error("Error");
      res.status(401).send({error:"please authenticated using valid token"})
    }
  }

}
//creating endpoint for adding product in cartitems
app.post('/addtocart',fetchUser,async(req,res)=>{
  // console.log("body",req.body,req.user)
  console.log("Added product Id:",req.body.itemId)
  let userData=await Users.findOne({_id:req.user.id});
  userData.cartData[req.body.itemId]+=1;
  await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("Added");


})
//creating endpoint to remove product from cartdata

app.post('/removefromcart',fetchUser,async(req,res)=>{
  console.log("Remove product Id:",req.body.itemId)
  let userData=await Users.findOne({_id:req.user.id});
  if(userData.cartData[req.body.itemId]>0)
  userData.cartData[req.body.itemId]-=1;
  await Users.findByIdAndUpdate({_id:req.user.id},{cartData:userData.cartData});
  res.send("Removed");


})

//creating endpoint  get cartdata

app.post('/getcart',fetchUser,async(req,res)=>{
  console.log("getCart");
  let userData=await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);

})
app.post('/getcart',fetchUser)
app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
