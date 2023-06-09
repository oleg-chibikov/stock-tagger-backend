import EventEmitter from 'events';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { Service } from 'typedi';
import { ImageController } from '../controllers/imageController';
import { generateRandomString } from '../services/helper';

@Service()
class ImageRouter {
  public router: Router;
  private storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (_req, file, cb) {
      const randomString = generateRandomString(16);
      const originalName = file.originalname;
      const newName = `${randomString}-${originalName}`;
      cb(null, newName);
    },
  });

  private upload = multer({ storage: this.storage });

  constructor(
    private imageController: ImageController,
    private emitter: EventEmitter
  ) {
    this.router = Router();
    this.setRoutes();
  }

  private setRoutes(): void {
    this.registerCaptionRoute();
    this.registerUploadRoute();

    // Add the /events route for sending SSE
    this.registerProgressSseRoute();
  }

  private registerCaptionRoute() {
    this.router.post(
      '/caption',
      (req: Request, res: Response, next: NextFunction) => {
        this.upload.array('images')(req, res, (err: unknown) => {
          console.log(req.files?.length);
          next(err);
        });
      },
      this.imageController.getImageCaptions
    );
  }

  private registerUploadRoute() {
    this.router.post(
      '/upload',
      (req: Request, res: Response, next: NextFunction) => {
        this.upload.array('images')(req, res, (err: unknown) => {
          console.log(req.files?.length);
          next(err);
        });
      },
      this.imageController.uploadImage
    );
  }

  private registerProgressSseRoute() {
    this.router.get(
      '/events',
      (_req: Request, res: Response, next: NextFunction) => {
        try {
          // Set the headers for an event stream
          res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          });
          // res.setHeader('Access-Control-Allow-Origin', 'http://localhost:19000');
          // Send an initial event to the client
          res.write('data: Connected\n\n');

          // Listen for events from the event emitter
          this.emitter.on('progress', (data) => {
            res.write(`event: progress\ndata: ${JSON.stringify(data)}\n\n`);
          });
        } catch (error) {
          next(error);
        }
      }
    );
  }
}

export { ImageRouter };
