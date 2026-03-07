const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const multer = require('multer');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());
app.use(express.static('./'));

// configure multer for handling image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// serve uploaded files statically
app.use('/uploads', express.static('uploads'));


// set up email transporter (SMTP credentials via .env)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// we skip verifying SMTP transporter during development to avoid startup errors
// (if you configure a real SMTP server, you can add verification here)


// helper to generate 6‑digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/back2u';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected...'))
.catch(err => console.log('MongoDB connection error:', err));

// Define Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  resetOTP: String,
  otpExpiry: Date,
  createdAt: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  image: { type: String }, // URL path to uploaded image or base64 string (legacy)
  userId: mongoose.Schema.Types.ObjectId,
  userName: String,
  userPhone: String,
  userEmail: String,
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  senderId: mongoose.Schema.Types.ObjectId,
  senderName: String,
  receiverId: mongoose.Schema.Types.ObjectId,
  receiverName: String,
  postId: mongoose.Schema.Types.ObjectId,
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Post = mongoose.model('Post', postSchema);
const Message = mongoose.model('Message', messageSchema);

// Routes
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete a post by ID (used when marking item as found)
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const deleted = await Post.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const post = new Post({
    title: req.body.title,
    description: req.body.description,
    image: image,
    userId: req.body.userId,
    userName: req.body.userName,
    userPhone: req.body.userPhone,
    userEmail: req.body.userEmail
  });

  try {
    const newPost = await post.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      phone: req.body.phone
    });

    const newUser = await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: newUser._id, username: newUser.username });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (user.password !== req.body.password) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    res.json({ message: 'Login successful', userId: user._id, username: user.username, phone: user.phone });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if user exists by email
app.post('/api/check-user', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
      res.json({ exists: true, userId: user._id, username: user.username, phone: user.phone });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user profile
app.put('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.username = req.body.username || user.username;
    user.phone = req.body.phone || user.phone;
    await user.save();

    res.json({ message: 'User updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user details
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('createdAt');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ createdAt: user.createdAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Password reset endpoints

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const otp = generateOTP();
    user.resetOTP = otp;
    user.otpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // send OTP via email
    transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@back2u.com',
      to: email,
      subject: 'Back2u Password Reset OTP',
      text: `Your OTP for password reset is ${otp}. It will expire in 15 minutes.`
    }, (err, info) => {
      if (err) {
        console.error('Error sending OTP email:', err);
        return res.status(500).json({ message: 'Failed to send OTP email' });
      }
      console.log('OTP email sent:', info.response);
      res.json({ message: 'OTP sent to email' });
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (!user.resetOTP || user.resetOTP !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.resetOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Messaging Endpoints
app.post('/api/messages', async (req, res) => {
  const message = new Message({
    senderId: req.body.senderId,
    senderName: req.body.senderName,
    receiverId: req.body.receiverId,
    receiverName: req.body.receiverName,
    postId: req.body.postId,
    message: req.body.message
  });

  try {
    const newMessage = await message.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get('/api/messages/:postId/:userId', async (req, res) => {
  try {
    const messages = await Message.find({
      postId: req.params.postId,
      $or: [
        { senderId: req.params.userId },
        { receiverId: req.params.userId }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

