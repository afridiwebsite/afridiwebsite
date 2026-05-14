import Schema from '../models';
import express from 'express'
import responseUtils from '../utils/response.utils';
import { Op, fn, col } from 'sequelize';

const {
    TopupProduct,
    Category,
    TopupProductInput
} = Schema;

class TopupProductController {

    async getProducts(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const data = await TopupProduct.findAll({
            attributes: {
                include: [
                    "logo",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("TopupProduct.logo")
                        ),
                        "logo_full_url",
                    ],
                ],
            }
        })
        response.data = data
        res.send(response.response)
    }

    async getProductById(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const id = (req.params.id as any);
        const data = await TopupProduct.findOne({
            where: {
                id,
            },
            attributes: {
                include: [
                    "logo",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("TopupProduct.logo")
                        ),
                        "logo_full_url",
                    ],
                ],
            },
            include: [
                { model: Category, as: 'categories', through: { attributes: [] }, required: false },
                { model: TopupProductInput, as: 'inputs', required: false },
            ]
        })

        if (!data) {
            response.status = 400;
            response.success = false;
            response.message = 'TopupProduct not found';
            return res.status(400).send(response.response)
        }

        response.data = data
        res.send(response.response)
    }

    async createProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const {
            name,
            price,
            logo,
            start_at,
            end_at,
            rules,
            topuptype,
            isactiveforsale,
            isactivefortopup,
            is_active,
            is_offer,
            offer_items,
        } = req.body

        const data = await TopupProduct.create({
            name,
            price,
            logo,
            start_at,
            end_at,
            rules,
            topuptype,
            isactiveforsale,
            isactivefortopup,
            is_active,
            is_offer,
            offer_items,
        })
        response.data = data
        res.send(response.response)
    }

    async updateProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);
        const {
            name,
            price,
            logo,
            start_at,
            end_at,
            rules,
            topuptype,
            isactiveforsale,
            serial,
            isactivefortopup,
            is_active,
            is_offer,
            offer_items,
        } = req.body

        const product = await TopupProduct.findByPk(id)

        if (!product) {
            response.status = 400;
            response.success = false;
            response.message = 'TopupProduct not found';
            return res.status(400).send(response.response)
        }

        product.name = name;
        product.price = price;
        product.logo = logo;
        product.start_at = start_at;
        product.end_at = end_at;
        product.rules = rules;
        product.topuptype = topuptype;
        product.isactiveforsale = isactiveforsale;
        product.isactivefortopup = isactivefortopup;
        product.is_active = is_active;
        product.serial = serial;
        product.is_offer = is_offer;
        product.offer_items = offer_items;

        await product.save();

        response.data = product
        res.send(response.response)
    }

    async deleteProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);

        await TopupProduct.destroy({
            where: {
                id,
            }
        })

        response.message = 'Deleted successfully'
        res.send(response.response)
    }

}

export default new TopupProductController();