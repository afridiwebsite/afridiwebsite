import Schema from '../models';
import express from 'express'
import { Sequelize } from 'sequelize'
import responseUtils from '../utils/response.utils';

const {
    User,
    Order, AuthModule, Admin, AdminAuth, TopupPackage, TopupPackagePermission, StoreUnipin
} = Schema;
/******************************************************************************
 *                              User Controller
 ******************************************************************************/
class TopupPackageController {
    async getTopupPackages(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        try {
            const topupPackages = await TopupPackage.findAll();
            response.data = topupPackages
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async getTopupPackageById(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = (req.params.id as any);

        try {
            const data = await TopupPackage.findByPk(id);
            response.data = data || [];
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async createTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = (req.params.id as any);
        const {
            product_id,
            name,
            price,
            bprice,
            in_stock,
            serial,
            logo
        } = req.body

        try {

            const topupPackage = await TopupPackage.create({
                product_id,
                name,
                price,
                bprice,
                in_stock,
                serial,
                logo
            })

            response.message = 'Created successfully'
            res.send(response.response)

        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async updateTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = (req.params.id as any);
        const {
            product_id,
            name,
            price,
            bprice,
            in_stock,
            serial,
            logo
        } = req.body

        try {
            const topupPackage = await TopupPackage.findByPk(id)
            if (!topupPackage) {
                response.message = 'Package not found to update'
                return res.status(400).send(response.internalError)
            }

            topupPackage.product_id = product_id;
            topupPackage.name = name;
            topupPackage.price = price;
            topupPackage.bprice = bprice;
            topupPackage.serial = serial;
            topupPackage.logo = logo;
            if (in_stock == 1 || in_stock == 0) {
                topupPackage.in_stock = in_stock;
            }
            await topupPackage.save()

            response.message = 'Updated successfully'
            res.send(response.response)

        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async deleteTopupPackage(req: express.Request, res: express.Response) {
        const response = new responseUtils()

        const id = (req.params.id as any);

        try {
            await TopupPackage.destroy({ where: { id } });
            response.message = 'Deleted successfully'
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async getTopupPackagesByProductId(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);

        try {
            const topupPackages = await TopupPackage.findAll({
                where: {
                    product_id: id,
                },
                attributes: ['id', 'product_id', 'name', 'type', 'price', 'bprice', 'in_stock', 'serial', 'logo', [Sequelize.fn('COUNT_VOUCHER',Sequelize.col('TopupPackage.id')), 'voucher']]
            });
            response.data = topupPackages
            res.send(response.response)
        } catch (error:any) {
            console.log(error);
            response.message = error?.message;
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async getTopupPackagePermissionByAdminId(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const id = (req.params.id as any);

        try {
            const topupPackages = await TopupPackagePermission.findAll({
                where: {
                    admin_id: id,
                },
                raw: true,
                attributes: ['topup_package_id'],
            });

            const onlyArray = topupPackages.map(e => e.topup_package_id)

            response.data = onlyArray
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }

    async addPermission(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const body = req.body;

        try {

            await TopupPackagePermission.destroy({
                where: {
                    admin_id: body.admin_id
                }
            })

            for (const packageId of body.topup_package_id) {
                await TopupPackagePermission.create({
                    admin_id: body.admin_id,
                    topup_package_id: packageId,
                })
            }
            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
    async updateDollarRate(req: express.Request, res: express.Response) {
        const response = new responseUtils()
        const { product_id, dollar_rate } = req.body;

        try {

            const packages = await TopupPackage.findAll({ where: { product_id } })

            if (!packages) {
                response.message = 'No packages found to update'
                return res.status(400).send(response.response)
            }

            packages.forEach(async (pakg) => {
                const updatedPrice = pakg.bprice == '0' ? pakg.price : parseInt(pakg.bprice) * parseFloat(dollar_rate)
                const toCeil = Math.ceil(Number(updatedPrice))
                pakg.price = toCeil.toString()
                await pakg.save()
            })

            res.send(response.response)
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false
            return res.status(400).send(response.response);
        }

    }
}

/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new TopupPackageController();
