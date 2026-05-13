import Schema from '../models';
import express from 'express';
import { Op, fn, col } from 'sequelize';
import responseUtils from '../utils/response.utils';

const { TopupProduct, TopupPackage } = Schema;

// Public search across products + packages.
//
// Query params:
//   q       — required, the search text (case-insensitive LIKE).
//   limit   — optional, max items *per bucket* (default 8, capped at 30).
//
// Response shape:
//   {
//     query: string,
//     products: [{ id, name, logo, logo_full_url }],
//     packages: [{ id, name, price, product_id, product_name, product_logo, product_logo_full_url }]
//   }
//
// Packages always carry the parent product info so the frontend can route a
// package click to `/topup/:product_id` without a second lookup.
class SearchController {
    async search(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const rawQ = (req.query.q || '').toString().trim();
            const limit = Math.min(
                Math.max(parseInt((req.query.limit || '8').toString(), 10) || 8, 1),
                30,
            );

            if (rawQ.length < 1) {
                response.data = { query: '', products: [], packages: [] };
                return res.send(response.response);
            }

            const reqPath = req.protocol + '://' + req.get('host');
            const buildImgUrl = (img: string | null | undefined) =>
                img ? `${reqPath}/images/${img}` : '';

            const like = `%${rawQ}%`;

            // 1) Products by name. Filter out inactive ones so the search
            //    doesn't surface things the user can't actually purchase.
            const products = await TopupProduct.findAll({
                where: {
                    name: { [Op.like]: like },
                    is_active: 1,
                },
                order: [['serial', 'ASC'], ['id', 'ASC']],
                limit,
            });

            // 2) Packages by name. Join with parent product so we can return
            //    name + logo + product_id alongside.
            const packages: any[] = await TopupPackage.findAll({
                where: { name: { [Op.like]: like } },
                order: [['serial', 'ASC'], ['id', 'ASC']],
                limit,
                include: [
                    {
                        model: TopupProduct,
                        required: false,
                        attributes: ['id', 'name', 'logo'],
                    },
                ],
            }).catch(() => [] as any[]);

            // Some installations don't have the explicit association registered
            // for TopupPackage→TopupProduct (we only declare hasMany on
            // StoreUnipin). Fall back to a manual fetch by `product_id` if the
            // include path returns no rows but packages did match.
            let packagesWithProduct: any[] = packages;
            const includeMissing = packages.length > 0 && !packages[0]?.TopupProduct;
            if (includeMissing) {
                const ids = Array.from(
                    new Set(packages.map((p: any) => p.product_id).filter(Boolean)),
                );
                const parents: any[] = ids.length
                    ? await TopupProduct.findAll({
                          where: { id: { [Op.in]: ids } },
                          attributes: ['id', 'name', 'logo'],
                      })
                    : [];
                const byId: Record<string, any> = {};
                parents.forEach((p) => { byId[p.id] = p; });
                packagesWithProduct = packages.map((p: any) => {
                    const parent = byId[p.product_id];
                    return Object.assign({}, p.toJSON(), { TopupProduct: parent ? parent.toJSON() : null });
                });
            }

            response.data = {
                query: rawQ,
                products: products.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    logo: p.logo,
                    logo_full_url: buildImgUrl(p.logo),
                })),
                packages: packagesWithProduct.map((p: any) => {
                    const j = typeof p.toJSON === 'function' ? p.toJSON() : p;
                    const parent = j.TopupProduct || {};
                    return {
                        id: j.id,
                        name: j.name,
                        price: j.price,
                        in_stock: j.in_stock,
                        product_id: j.product_id,
                        product_name: parent.name || null,
                        product_logo: parent.logo || null,
                        product_logo_full_url: buildImgUrl(parent.logo),
                    };
                }),
            };
            res.send(response.response);
        } catch (e) {
            console.log(e);
            response.status = 400;
            response.success = false;
            response.message = 'Search failed';
            return res.status(400).send(response.response);
        }
    }
}

export default new SearchController();
