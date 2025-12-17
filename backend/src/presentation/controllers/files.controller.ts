import { Controller, Post, UseInterceptors, UploadedFile, Get, Param, Res, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { join } from 'path';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
        throw new Error("File upload failed");
    }
    // Return the URL to access the file
    // Assuming backend runs on same host/port relative path
    // Or return full URL if ENV is set
    // For now, return relative path
    return {
      url: `/files/${file.filename}`,
      path: file.path,
      size: file.size,
      contentType: file.mimetype
    };
  }

  @Get(':filename')
  seeUploadedFile(@Param('filename') filename: string, @Res() res: Response) {
    // Serve file
    return res.sendFile(join(process.cwd(), 'uploads', filename));
  }
}
