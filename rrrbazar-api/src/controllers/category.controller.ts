import Schema from '../models';
import express from 'express';
import responseUtils from '../utils/response.utils';
import { Op } from 'sequelize';

const { Category, TopupProduct, ProductCategory } = Schema;

const slugify = (text: string) =>
    String(text || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

class CategoryController {
    async getCategories(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const data = await Category.findAll({
            order: [['serial', 'ASC'], ['id', 'ASC']],
        });
        response.data = data;
        res.send(response.response);
    }

    async getCategoryById(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const data = await Category.findByPk((req.params.id as any), {
            include: [{ model: TopupProduct, as: 'topup_products' }],
        });
        if (!data) {
            response.status = 400;
            response.success = false;
            response.message = 'Category not found';
            return res.status(400).send(response.response);
        }
        response.data = data;
        res.send(response.response);
    }

    async createCategory(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const { name, emoji, serial, is_active } = req.body;
        const slug = slugify(name);

        const exists = await Category.findOne({ where: { slug } });
        if (exists) {
            response.status = 400;
            response.success = false;
            response.message = 'Category already exists';
            return res.status(400).send(response.response);
        }

        const data = await Category.create({ name, slug, emoji, serial, is_active });
        response.data = data;
        res.send(response.response);
    }

    async updateCategory(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const id = (req.params.id as any);
        const { name, emoji, serial, is_active } = req.body;
        const cat = await Category.findByPk(id);
        if (!cat) {
            response.status = 400;
            response.success = false;
            response.message = 'Category not found';
            return res.status(400).send(response.response);
        }
        cat.name = name;
        cat.slug = slugify(name);
        cat.emoji = emoji;
        cat.serial = serial;
        cat.is_active = is_active;
        await cat.save();
        response.data = cat;
        res.send(response.response);
    }

    async deleteCategory(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        await Category.destroy({ where: { id: (req.params.id as any) } });
        await ProductCategory.destroy({ where: { category_id: (req.params.id as any) } });
        response.message = 'Deleted';
        res.send(response.response);
    }

    async assignProductCategories(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const product_id = Number((req.params.id as any));
        const category_ids: number[] = Array.isArray(req.body.category_ids)
            ? req.body.category_ids
            : [];

        await ProductCategory.destroy({ where: { topup_product_id: product_id } });
        if (category_ids.length) {
            await ProductCategory.bulkCreate(
                category_ids.map((cid) => ({
                    topup_product_id: product_id,
                    category_id: cid,
                }))
            );
        }
        response.message = 'Categories assigned';
        res.send(response.response);
    }
}

export default new CategoryController();
