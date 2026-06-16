const mongoose = require("mongoose");

const blacklistTokenSchema = new mongoose.Schema({
    token:{
        type:String,
        required: [true, "Token is Required"],
    }    
},{
    timestamps: true
})

const blackListTokenModel = mongoose.model("BlacklistToken",blacklistTokenSchema);

module.exports = blackListTokenModel;