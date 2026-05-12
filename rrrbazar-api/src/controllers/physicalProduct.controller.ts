import express from 'express';
import { col, fn, Op } from 'sequelize';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const {
    Product,
    ProductOrder,
    User
} = Schema;

class PhysicalProductController {

    async getProducts(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const reqPath = req.protocol + "://" + req.get("host");

        const data = await Product.findAll({
            attributes: {
                include: [
                    "image",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Product.image")
                        ),
                        "image_full_url",
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

        const id = req.params.id
        const data = await Product.findOne({
            where: {
                id,
            },
            attributes: {
                include: [
                    "image",
                    [
                        fn(
                            "CONCAT",
                            reqPath + "/images/",
                            col("Product.image")
                        ),
                        "image_full_url",
                    ],
                ],
            }
        })

        if (!data) {
            response.status = 400;
            response.success = false;
            response.message = 'Product not found';
            return res.status(400).send(response.response)
        }

        response.data = data
        res.send(response.response)
    }

    async createProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const {
            name,
            image,
            sale_price,
            regular_price,
            description,
            quantity,
            is_active,
        } = req.body

        const checkExist = await Product.findAll({
            where: {
                [Op.or]: [
                    {
                        name: name
                    },
                    {
                        image: image
                    }
                ]
            }
        })

        if (checkExist?.length > 0) {
            response.status = 400;
            response.success = false;
            response.message = 'Product is already exist';
            return res.status(400).send(response.response)
        }


        const data = await Product.create({
            name,
            image,
            sale_price,
            regular_price,
            description,
            quantity,
            is_active,
        })
        response.data = data
        res.send(response.response)
    }

    async updateProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id
        const {
            name,
            image,
            sale_price,
            regular_price,
            description,
            quantity,
            is_active,
        } = req.body

        const product = await Product.findByPk(id)

        if (!product) {
            response.status = 400;
            response.success = false;
            response.message = 'Product not found';
            return res.status(400).send(response.response)
        }

        product.name = name;
        product.image = image;
        product.sale_price = sale_price;
        product.regular_price = regular_price;
        product.description = description;
        product.quantity = quantity;
        product.is_active = is_active;

        await product.save();

        response.data = product
        res.send(response.response)
    }

    async deleteProduct(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = req.params.id

        await Product.destroy({
            where: {
                id,
            }
        })

        response.message = 'Deleted successfully'
        res.send(response.response)
    }

    async getProductOrders(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        try {
            const { q } = req.query;
            const response = new responseUtils()
            const filter: any = {};

            const whereQuery = q ? {
                [Op.or]: [
                    {
                        user_id: q
                    },
                    {
                        product_id: q
                    }
                ]
            } : undefined;

            const limit: any = parseInt(req.query.limit?.toString() || '20')
            const page: any = parseInt(req.query.page?.toString() || '1')

            const orderCount = await ProductOrder.count({
                where: whereQuery,
            })

            const orders = await ProductOrder.findAll({
                offset: (page - 1) * limit,
                limit: limit,
                where: whereQuery,
                include: [
                    {
                        model: User,
                        // attributes: ['first_name', 'last_name']
                    },
                    {
                        model: Product
                    }
                ],
                raw: true,
                order: [
                    ['id', 'DESC'],
                ],
            })
            response.data = { orders, order_count: orderCount };
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal error'
            res.status(400).send(response.internalError)
        }
    }


    async updatePhysicalProductOrderStatus(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const order_id = req.params.id;
        const admin = (req.admin as any);
        const statusToUpdate = req.body.status;
        const orderNote = req.body.order_note;
        // const completedById = admin.id;
        const order = await ProductOrder.findByPk(order_id);

        if (!order) {
            response.message = 'Order not found';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response)
        }

        if (order.status !== 'pending' && order.status !== 'in_progress') {
            response.message = `Order is not available for edit`;
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response)
        }


        if (statusToUpdate == 'cancelled') {
            let product = await Product.findByPk(order.product_id);
            let user = await User.findByPk(order.user_id);

            if (!user || !product) {
                response.message = `Something went wrong!`;
                response.status = 400;
                response.success = false;
                return res.status(400).send(response.response)
            }

            user.wallet = user.wallet + parseInt((order as any).amount)

            product.quantity = product.quantity + 1

            await product.save()
            await user.save()
        }

        if (req.body.order_note) {
            order.admin_message = req.body.order_note;
        }


        order.status = statusToUpdate;
        // order.brief_note = orderNote;
        // order.completed_by = completedById;
        await order.save()

        response.message = 'Order updated successfully';
        response.data = order
        res.send(response.response)
    }

}

export default new PhysicalProductController();