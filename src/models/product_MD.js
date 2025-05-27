import mongoose from "mongoose"
import mongoosePaginate from 'mongoose-paginate-v2';

const productSchema = new mongoose.Schema({
    name:{
        type:String,required:true
    },
    description:{String},
    brand:{type:mongoose.Schema.Types.ObjectId,ref:"Brand"},
    category:{type:mongoose.Schema.Types.ObjectId,ref:"Category"},
    gender:{type:String,enum:['unisex','male','female']},
    variants:[{type:mongoose.Schema.Types.ObjectId,ref:"Variant"}]
},{timestamps:true});

// productSchema.pre('save', updateCategoryAndBrandOnProductSave);
productSchema.plugin(mongoosePaginate);

export default mongoose.model("Products",productSchema)