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

    // Windows (AV / Search indexer) can briefly hold a write lock on a file
    // multer just created, so a writeFile to the same directory can fail with
    // EBUSY / EPERM / UNKNOWN. Retry a few times with a short backoff before
    // giving up — without this the upload 500s and the admin sees a spurious
    // "image upload failed" toast even though the file is fine.
    #writeFileWithRetry = async (target: string, buf: Buffer, tries = 4) => {
        for (let i = 0; i < tries; i++) {
            try {
                await fs.promises.writeFile(target, buf);
                return;
            } catch (err: any) {
                const code = err?.code;
                const retryable =
                    code === "EBUSY" ||
                    code === "EPERM" ||
                    code === "UNKNOWN" ||
                    code === "EACCES";
                if (!retryable || i === tries - 1) throw err;
                await new Promise((r) => setTimeout(r, 150 * (i + 1)));
            }
        }
    };

    #resizeAndGenerateThumb = async (file: any) => {
        const { filename: image } = file;
        // Read into a Buffer first and feed sharp the Buffer (not file.path).
        // On Windows, AV/indexers briefly hold a handle on a file multer
        // just wrote, and libvips can mmap the input — both make a
        // subsequent writeFileSync to the same path fail with
        // "UNKNOWN: unknown error, open …". Reading once up-front
        // closes the handle before we write back.
        const inputBuf = await fs.promises.readFile(file.path);

        const thumbDir = path.join(file.destination, 'thumb');
        await fs.promises.mkdir(thumbDir, { recursive: true });

        // Animated GIFs lose every frame after the first when sent through
        // sharp's default pipeline — it doesn't enable animation unless
        // explicitly asked. Detect GIF input (by extension and the GIF89a
        // / GIF87a magic bytes) and skip resizing so the original animated
        // bytes land on disk intact. Thumb is just a copy of the source —
        // server-side resizing of animated GIFs is expensive and noisy.
        const origName = String(file.originalname || '').toLowerCase();
        const isGifExt = origName.endsWith('.gif');
        const isGifMagic =
            inputBuf.length >= 6 &&
            inputBuf[0] === 0x47 && // 'G'
            inputBuf[1] === 0x49 && // 'I'
            inputBuf[2] === 0x46 && // 'F'
            inputBuf[3] === 0x38; // '8' (87a / 89a)
        if (isGifExt || isGifMagic) {
            await this.#writeFileWithRetry(path.join(file.destination, image), inputBuf);
            await this.#writeFileWithRetry(path.join(thumbDir, image), inputBuf);
            return image;
        }

        const buff = await sharp(inputBuf)
            .resize(900)
            .withMetadata()
            .toBuffer()

        const thumbBuff = await sharp(buff)
            .resize(100)
            .withMetadata()
            .toBuffer()

        await this.#writeFileWithRetry(path.join(file.destination, image), buff);
        await this.#writeFileWithRetry(path.join(thumbDir, image), thumbBuff);

        return image

    }
}



/******************************************************************************
 *                               Export
 ******************************************************************************/
export default new UploadController;