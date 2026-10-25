import mongoose from "mongoose";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("DataBase Connected")

        for (const name of mongoose.modelNames()) {
            await mongoose.model(name).createCollection()
        }
        console.log("Collections ready:", mongoose.modelNames().join(", "))
    } catch (error) {
        console.log(`DataBase Error ${error}`)
    }
}

export default connectDb