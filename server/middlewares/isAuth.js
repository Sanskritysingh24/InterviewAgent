import jwt from "jsonwebtoken"
import { clearAuthCookie } from "../config/authCookie.js"


const isAuth = async (req,res,next) => {
    try {
        let {token} = req.cookies

        if(!token){
            return res.status(401).json({message:"Authentication required"})
        }
        const verifyToken = jwt.verify(token , process.env.JWT_SECRET)
        
        if(!verifyToken){
            clearAuthCookie(res)
            return res.status(401).json({message:"Invalid or expired session"})
        }
        req.userId = verifyToken.userId

        next()
   

    } catch (error) {
        clearAuthCookie(res)
        return res.status(401).json({message:"Invalid or expired session"})
    }
    
}

export default isAuth