import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';
import { fn, col } from 'sequelize';

const { TopupProduct, Category } = Schema;

class PublicTopupProductController {
    async listWithCategories(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const reqPath = req.protocol + '://' + req.get('host');

        // Start by fetching the flat product list — this is guaranteed to work
        // even if the categories table/association is missing. Inactive
        // products (`is_active = 0`) are excluded so the home grid only
        // shows what admins have marked as live.
        let products: any[] = [];
        try {
            products = await TopupProduct.findAll({
                where: { is_active: 1 },
                // Lean projection — the home grid's Game tile only reads
                // id/name/logo/product_link. Selecting the full row (long
                // description/meta columns) was the bulk of the page payload.
                attributes: [
                    'id',
                    'name',
                    'logo',
                    'product_link',
                    [
                        fn('CONCAT', reqPath + '/images/', col('TopupProduct.logo')),
                        'logo_full_url',
                    ],
                ],
                include: [
                    {
                        model: Category,
                        as: 'categories',
                        // Only the id is needed (grouping below); skipping the
                        // rest keeps the nested category objects tiny.
                        attributes: ['id'],
                        through: { attributes: [] },
                        required: false,
                    },
                ],
                order: [['serial', 'ASC']],
            });
        } catch (err) {
            // Association/categories table might not be set up yet — fall back
            // to the products-only query so the home page still renders.
            console.error('listWithCategories: include failed, falling back', err);
            products = await TopupProduct.findAll({
                where: { is_active: 1 },
                attributes: [
                    'id',
                    'name',
                    'logo',
                    'product_link',
                    [
                        fn('CONCAT', reqPath + '/images/', col('TopupProduct.logo')),
                        'logo_full_url',
                    ],
                ],
                order: [['serial', 'ASC']],
            });
        }

        let categories: any[] = [];
        try {
            categories = await Category.findAll({
                where: { is_active: 1 },
                order: [['serial', 'ASC'], ['id', 'ASC']],
            });
        } catch (err) {
            console.error('listWithCategories: categories fetch failed', err);
        }

        const grouped = categories.map((cat: any) => {
            const catJson = cat.toJSON();
            const inCat = products.filter((p: any) =>
                (p.categories || []).some((c: any) => c.id === catJson.id)
            );
            return {
                ...catJson,
                products: inCat.map((p: any) => p.toJSON()),
            };
        });

        const uncategorized = products
            .filter((p: any) => !p.categories || p.categories.length === 0)
            .map((p: any) => p.toJSON());

        response.data = {
            categories: grouped,
            uncategorized,
            products: products.map((p: any) => p.toJSON()),
        };
        res.send(response.response);
    }
}

export default new PublicTopupProductController();
