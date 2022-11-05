const express = require('express')
const {
    loginUser,
    signupUser,
    getUser,
    updateUser,
    updateProfileImg,
    getProfileImg,
    deleteUser
} = require('./userController')


const router = express.Router()

// Login route
router.post('/login', loginUser)

// Signup route
router.post('/signup', signupUser)

// Get user
router.post('/:id', getUser)

// Update user
router.patch('/:id', updateUser)

// Update user profile_img
router.patch('/profile_img/:id', updateProfileImg)

// Get user profile_img
router.post('/profile_img/:id', getProfileImg)

// Delete user
router.delete('/:id', deleteUser)


module.exports = router