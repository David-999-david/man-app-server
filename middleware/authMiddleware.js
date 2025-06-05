require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = function authorizationCheck(req ,res , next){

    const header = req.headers['authorization'];
    if (!header){
        const err = new Error('Missing header,authorization');
        err.status = 401;
        return next(err);
    }

    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer'){
        const err = new Error('Authorization part is not match');
        err.status = 401;
        return next(err);
    }

    const token = parts[1];
    if (!token){
        const err = new Error('Token is missing');
        err.status = 401;
        return next(err);
    }

    jwt.verify(token,JWT_SECRET, (err,payload) => {
        if (err){
            err.status = 403;
            return next(err);
        }
        req.userId = payload.userId;
        next();
    });
}