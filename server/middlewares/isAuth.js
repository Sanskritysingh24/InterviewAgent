import jwt from "jsonwebtoken"


const isAuth = async (req,res,next) => {
    try {
        let {token} = req.cookies

        if(!token){
            return res.status(401).json({message:"Authentication required"})
        }
        const verifyToken = jwt.verify(token , process.env.JWT_SECRET)
        
        if(!verifyToken){
            res.clearCookie("token", { path: "/", sameSite: "strict", secure: false })
            return res.status(401).json({message:"Invalid or expired session"})
        }
        req.userId = verifyToken.userId

        next()
   

    } catch (error) {
        res.clearCookie("token", { path: "/", sameSite: "strict", secure: false })
        return res.status(401).json({message:"Invalid or expired session"})
    }
    
}

export default isAuth