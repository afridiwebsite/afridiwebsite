import Schema from '../models';
import express from 'express'
import { Sequelize } from 'sequelize'
import responseUtils from '../utils/response.utils';

const {
    User,
    Order, AuthModule, Admin, AdminAuth, TopupPackage, TopupPackagePermission, StoreUnipin
} = Schema;

// Accepts the array the admin form sends, or a stringified array, and
// returns a clean array of trimmed, non-empty strings. Anything that
// isn't an array (or string that parses to one) collapses to [].
function normalizeTagList(raw: any): string[] {
    let arr: any = raw;
    if (typeof arr === 'string') {
        try {
            arr = JSON.parse(arr);
        } catch {
            arr = [];
        }
    }
    if (!Array.isArray(arr)) return [];
    return arr
        .map((v: any) => String(v == null ? '' : v).trim())
        .filter((s: string) => s.length > 0);
}

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
            logo,
            coin_value,
            description,
            order_once,
            bot_url,
            auto_delivery,
            allow_quantity,
            stock_tracking,
            stock_quantity,
            is_shell,
            shell,
            tags,
        } = req.body

        try {

            const shellOn = auto_delivery == 1 && is_shell == 1;
            const cleanShell = shellOn ? String(shell || '').trim() : '';
            const cleanTags = shellOn ? normalizeTagList(tags) : [];

            // Shell packages must have a shell code AND at least one tag.
            // The admin form enforces this client-side, but reject here
            // too in case someone POSTs around the form.
            if (shellOn && (!cleanShell || cleanTags.length === 0)) {
                response.message = !cleanShell
                    ? 'Shell value is required when "Is shell" is on'
                    : 'At least one tag is required when "Is shell" is on';
                response.status = 400;
                response.success = false;
                return res.status(400).send(response.response);
            }

            const topupPackage = await TopupPackage.create({
                product_id,
                name,
                price,
                bprice,
                in_stock,
                serial,
                logo,
                coin_value: Number(coin_value) || 0,
                description: description || '',
                order_once: Number(order_once) === 2 ? 2 : Number(order_once) === 1 ? 1 : 0,
                bot_url: String(bot_url || '').trim(),
                auto_delivery: auto_delivery == 1 ? 1 : 0,
                allow_quantity: allow_quantity == 1 ? 1 : 0,
                stock_tracking: stock_tracking == 1 ? 1 : 0,
                stock_quantity: stock_tracking == 1 ? Math.max(0, Number(stock_quantity) || 0) : 0,
                // Shell only makes sense when auto-delivery is on — the bot
                // is the thing that uses it. Off auto-delivery rows clear
                // shell+tags back to defaults regardless of what was sent.
                is_shell: shellOn ? 1 : 0,
                shell: cleanShell,
                tags: JSON.stringify(cleanTags),
            })

            response.message = 'Created successfully'
            response.data = topupPackage
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
            logo,
            coin_value,
            description,
            order_once,
            bot_url,
            auto_delivery,
            allow_quantity,
            stock_tracking,
            stock_quantity,
            is_shell,
            shell,
            tags,
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
            if (coin_value !== undefined) {
                topupPackage.coin_value = Number(coin_value) || 0;
            }
            if (description !== undefined) {
                topupPackage.description = description;
            }
            if (order_once !== undefined) {
                topupPackage.order_once =
                    Number(order_once) === 2 ? 2 : Number(order_once) === 1 ? 1 : 0;
            }
            if (bot_url !== undefined) {
                topupPackage.bot_url = String(bot_url || '').trim();
            }
            if (auto_delivery !== undefined) {
                topupPackage.auto_delivery = auto_delivery == 1 ? 1 : 0;
            }
            if (allow_quantity !== undefined) {
                topupPackage.allow_quantity = allow_quantity == 1 ? 1 : 0;
            }
            if (stock_tracking !== undefined) {
                topupPackage.stock_tracking = stock_tracking == 1 ? 1 : 0;
                // When tracking is turned off, zero the count so it doesn't
                // linger and surprise anyone re-enabling later. When on, take
                // the value if provided.
                if (topupPackage.stock_tracking === 0) {
                    topupPackage.stock_quantity = 0;
                } else if (stock_quantity !== undefined) {
                    topupPackage.stock_quantity = Math.max(0, Number(stock_quantity) || 0);
                }
            } else if (stock_quantity !== undefined && topupPackage.stock_tracking === 1) {
                topupPackage.stock_quantity = Math.max(0, Number(stock_quantity) || 0);
            }
            // Shell: scoped to auto-delivery. If auto-delivery is off, force
            // shell + tags back to defaults so a stale value doesn't haunt
            // the bot dispatch later.
            const isAutoOn = (topupPackage.auto_delivery as any) == 1;
            const shellWillBeOn =
                is_shell !== undefined
                    ? isAutoOn && is_shell == 1
                    : isAutoOn && topupPackage.is_shell === 1;

            if (shellWillBeOn) {
                // Resolve the new shell/tags values from the request, falling
                // back to current saved values when not provided.
                const nextShell =
                    shell !== undefined
                        ? String(shell || '').trim()
                        : String(topupPackage.shell || '').trim();
                const nextTags =
                    tags !== undefined
                        ? normalizeTagList(tags)
                        : normalizeTagList(topupPackage.tags);
                if (!nextShell || nextTags.length === 0) {
                    response.message = !nextShell
                        ? 'Shell value is required when "Is shell" is on'
                        : 'At least one tag is required when "Is shell" is on';
                    response.status = 400;
                    response.success = false;
                    return res.status(400).send(response.response);
                }
                topupPackage.is_shell = 1;
                topupPackage.shell = nextShell;
                topupPackage.tags = JSON.stringify(nextTags);
            } else if (is_shell !== undefined || !isAutoOn) {
                topupPackage.is_shell = 0;
                topupPackage.shell = '';
                topupPackage.tags = '[]';
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
