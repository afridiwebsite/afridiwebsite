const jwt = require('jsonwebtoken')

exports.generateToken = (data, expiresIn) => {
    return jwt.sign(data, process.env.JWT_SECRET, {expiresIn})
}