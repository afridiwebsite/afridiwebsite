const {responseFormat} = require('../utils/common.utils')
import Response from '../utils/response.utils';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import urljoin from 'url-join';
import util from '../utils/common.utils'
import express from 'express'

/******************************************************************************
 *                              Upload Controller
 ******************************************************************************/
class UploadController {
    uploadImage = async (req: express.Request, res: express.Response) => {
        const response = new Response();
        try {
            const image = await this.#resizeAndGenerateThumb(req.file)
            const imgUrl = util.getImagePath(req)
            response.data = {
                image,
                image_url: urljoin(imgUrl, image),
                image_thumb_url: urljoin(imgUrl, 'thumb', image)
            }
            res.send(response.response)
        } catch (error) {
            console.log(error)
            response.success = false;
            response.status = 500;
            response.message = 'Image upload failed';
            res.status(500).send(response.response)
        }
    }

    async uploadIcon(req: express.Request, res: express.Response) {
        res.send(responseFormat({image: req?.file?.filename}, true, 200, 'Icon Successfully Uploaded'))
    }

    #resizeAndGenerateThumb = async (file: any) => {
        const { filename: image } = file;
        // Read into a Buffer first and feed sharp the Buffer (not file.path).
        // On Windows, AV/indexers briefly hold a handle on a file multer
        // just wrote, and libvips can mmap the input — both make a
        // subsequent writeFileSync to the same path fail with
        // "UNKNOWN: unknown error, open …". Reading once up-front
        // closes the handle before we write back.
        const inputBuf = await fs.promises.readFile(file.path);

        const buff = await sharp(inputBuf)
            .resize(900)
            .withMetadata()
            .toBuffer()

        const thumbBuff = await sharp(buff)
            .resize(100)
            .withMetadata()
            .toBuffer()

        const thumbDir = path.join(file.destination, 'thumb');
        await fs.promises.mkdir(thumbDir, { recursive: true });

        await fs.promises.writeFile(path.join(file.destination, image), buff);
        await fs.promises.writeFile(path.join(thumbDir, image), thumbBuff);

        return image

    }
}



/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UploadController;