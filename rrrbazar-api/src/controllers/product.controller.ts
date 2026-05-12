import express from 'express';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const {
    Product
} = Schema;

class ProductController {

    getProducts = async (req: express.Request, res: express.Response) => {
        const response = new responseUtils()
        try {
            const products = await Product.findAll();
            response.data = products;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            res.status(500).json(response.internalError);
        }
    }

    getSingleProduct = async (req: express.Request, res: express.Response) => {
        const response = new responseUtils()
        const id = req.params.id
        try {
            const product = await Product.findByPk(id);

            if (!product) {
                response.message = 'Product not found'
                return res.status(400).send(response.response)
            }

            response.data = product;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            res.status(500).json(response.internalError);
        }
    }


}

export default new ProductController();