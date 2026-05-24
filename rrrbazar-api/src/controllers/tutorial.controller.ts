import express from 'express';
import Schema from '../models';
import responseUtils from '../utils/response.utils';

const { Tutorial } = Schema;

class TutorialController {

    // Admin — full list (active + inactive), ordered by serial then id.
    async getTutorials(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const data = await Tutorial.findAll({
                order: [['serial', 'ASC'], ['id', 'DESC']],
            });
            response.data = data;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }

    // Storefront — only the active rows, same ordering.
    async getActiveTutorials(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        try {
            const data = await Tutorial.findAll({
                where: { is_active: 1 },
                order: [['serial', 'ASC'], ['id', 'DESC']],
            });
            response.data = data;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }

    async getTutorialById(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const id = (req.params.id as any);
        try {
            const data = await Tutorial.findByPk(id);
            if (!data) {
                response.message = 'Tutorial not found';
                response.status = 400;
                response.success = false;
                return res.status(400).send(response.response);
            }
            response.data = data;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }

    async createTutorial(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const { title, description, video_link, is_active, serial } = req.body;
        try {
            const data = await Tutorial.create({
                title: String(title || '').trim(),
                description: description || '',
                video_link: String(video_link || '').trim(),
                is_active: is_active == 0 ? 0 : 1,
                serial: Number(serial) || 0,
            });
            response.message = 'Created successfully';
            response.data = data;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }

    async updateTutorial(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const id = (req.params.id as any);
        const { title, description, video_link, is_active, serial } = req.body;
        try {
            const tutorial = await Tutorial.findByPk(id);
            if (!tutorial) {
                response.message = 'Tutorial not found';
                response.status = 400;
                response.success = false;
                return res.status(400).send(response.response);
            }
            if (title !== undefined) tutorial.title = String(title || '').trim();
            if (description !== undefined) tutorial.description = description || '';
            if (video_link !== undefined) tutorial.video_link = String(video_link || '').trim();
            if (is_active !== undefined) tutorial.is_active = is_active == 0 ? 0 : 1;
            if (serial !== undefined) tutorial.serial = Number(serial) || 0;
            await tutorial.save();

            response.message = 'Updated successfully';
            response.data = tutorial;
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }

    async deleteTutorial(req: express.Request, res: express.Response) {
        const response = new responseUtils();
        const id = (req.params.id as any);
        try {
            await Tutorial.destroy({ where: { id } });
            response.message = 'Deleted successfully';
            res.send(response.response);
        } catch (error) {
            console.log(error);
            response.message = 'Internal Error! Try again';
            response.status = 400;
            response.success = false;
            return res.status(400).send(response.response);
        }
    }
}

export default new TutorialController();
