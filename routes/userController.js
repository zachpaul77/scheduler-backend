const User = require('../models/userModel')
const jwt = require('jsonwebtoken')

const createToken = (_id) => {
  return jwt.sign({_id}, process.env.SECRET, { expiresIn: '3d' })
}

// login a user
const loginUser = async(req, res) => {
  const {email, password} = req.body

  try {
    const user = await User.login(email, password)

    // create a token
    const token = createToken(user._id)

    res.status(200).json({email, token})
  } catch (error) {
    res.status(400).json({error: error.message})
  }
}

// signup a user
const signupUser = async(req, res) => {
  const {email, password} = req.body

  try {
    const user = await User.signup(email, password)

    // create a token
    const token = createToken(user._id)

    res.status(200).json({email, token})
  } catch (error) {
    res.status(400).json({error: error.message})
  }
}

// Get a user
const getUser = async(req, res) => {
  res.status(200).json({status: "getUser"})
}

// Update a user
const updateUser = async(req, res) => {
  res.status(200).json({status: "updateUser"})
}

// Update user profile img
const updateProfileImg = async(req, res) => {
  res.status(200).json({status: "updateProfileImg"})
}

// Get user profile img
const getProfileImg = async(req, res) => {
  res.status(200).json({status: "getProfileImg"})
}

// Delete a user
const deleteUser = async(req, res) => {
  res.status(200).json({status: "deleteUser"})
}

module.exports = {
  loginUser,
  signupUser,
  getUser,
  updateUser,
  updateProfileImg,
  getProfileImg,
  deleteUser
}