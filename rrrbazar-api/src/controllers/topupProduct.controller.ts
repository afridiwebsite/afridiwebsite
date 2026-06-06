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
            order: [
                ["serial", "ASC"],
            ],
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

    /**
     * Topup products grouped by category for the admin product list.
     *
     * Returns one entry per category (active ones, ordered by `serial`)
     * with its products nested inside, plus an "Uncategorized" bucket
     * at the end for products that aren't pinned to any category.
     *
     * Because the relationship is many-to-many a product can show up in
     * more than one category — that's intentional, the admin sees the
     * product everywhere it's reachable in the storefront. The
     * "Uncategorized" bucket therefore only contains products that
     * belong to *no* category at all.
     *
     * Shape:
     *   [{ id, name, serial, products: [...] }, …,
     *    { id: null, name: 'Uncategorized', products: [...] }]
     */
    async getProductsGroupedByCategory(
        req: express.Request,
        res: express.Response,
    ) {
        const response = new responseUtils();
        try {
            const reqPath = req.protocol + "://" + req.get("host");

            // Pull every category with its products in one go. `through:
            // { attributes: [] }` strips the pivot row so the payload
            // stays small. Products are sorted by `serial` ASC inside the
            // group.
            const categories = await Category.findAll({
                where: { is_active: 1 },
                order: [
                    ["serial", "ASC"],
                    [{ model: TopupProduct, as: "topup_products" }, "serial", "ASC"],
                ],
                include: [
                    {
                        model: TopupProduct,
                        as: "topup_products",
                        required: false,
                        through: { attributes: [] },
                        attributes: {
                            include: [
                                "logo",
                                [
                                    fn(
                                        "CONCAT",
                                        reqPath + "/images/",
                                        col("topup_products.logo"),
                                    ),
                                    "logo_full_url",
                                ],
                            ],
                        },
                    },
                ],
            });

            // Now find products that belong to no category at all.
            // Easier than a NOT-IN subquery: load every product, then
            // filter out the ones that appeared in any category above.
            const allProducts = await TopupProduct.findAll({
                 order: [
                    ["serial", "ASC"],
                ],
                attributes: {
                    include: [
                        "logo",
                        [
                            fn(
                                "CONCAT",
                                reqPath + "/images/",
                                col("TopupProduct.logo"),
                            ),
                            "logo_full_url",
                        ],
                    ],
                },
            });

            const categorizedIds = new Set<number>();
            for (const c of categories as any[]) {
                for (const p of c.topup_products || []) {
                    categorizedIds.add(p.id);
                }
            }
            const uncategorizedProducts = (allProducts as any[]).filter(
                (p) => !categorizedIds.has(p.id),
            );

            const groups: any[] = (categories as any[]).map((c) => ({
                id: c.id,
                name: c.name,
                emoji: c.emoji,
                serial: c.serial,
                products: c.topup_products || [],
            }));
            if (uncategorizedProducts.length > 0) {
                groups.push({
                    id: null,
                    name: "Uncategorized",
                    emoji: "",
                    serial: null,
                    products: uncategorizedProducts,
                });
            }

            response.data = groups;
            res.send(response.response);
        } catch (error) {
            console.log("getProductsGroupedByCategory error", error);
            response.message = "Failed to load grouped products";
            response.status = 400;
            response.success = false;
            res.status(400).send(response.response);
        }
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
            product_link,
            youtube_link,
            is_voucher,
            redeem_link,
            quantity_prefix,
            allow_quantity,
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
            product_link: product_link || '',
            youtube_link: youtube_link || '',
            is_voucher: is_voucher == 1 ? 1 : 0,
            redeem_link: redeem_link || '',
            // Cap to the column width (64) — admin form lets them type
            // anything but the DB truncation would silently lose chars.
            quantity_prefix: String(quantity_prefix || '').slice(0, 64),
            allow_quantity: allow_quantity == 1 ? 1 : 0,
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
            product_link,
            youtube_link,
            is_voucher,
            redeem_link,
            quantity_prefix,
            allow_quantity,
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
        if (product_link !== undefined) product.product_link = product_link || '';
        if (youtube_link !== undefined) product.youtube_link = youtube_link || '';
        if (is_voucher !== undefined) product.is_voucher = is_voucher == 1 ? 1 : 0;
        if (redeem_link !== undefined) product.redeem_link = redeem_link || '';
        if (quantity_prefix !== undefined)
            product.quantity_prefix = String(quantity_prefix || '').slice(0, 64);
        if (allow_quantity !== undefined)
            product.allow_quantity = allow_quantity == 1 ? 1 : 0;

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