import express from 'express';
import { Express, Request, Response, NextFunction } from 'express';
import { CarrierDatabase } from '../database/database';
import { CustomError, RequestValidationHelper, UserControllerBasic } from 'itmat-utils';
import bodyParser from 'body-parser';
import passport from 'passport';
import { UserUtils } from '../utils/userUtils';
import session from 'express-session';
import connectMongo from 'connect-mongo';
const MongoStore = connectMongo(session);


export class Router {
    constructor() {
        const app: Express = express();

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        app.use(session({
            secret: 'IAmATeapot',
            store: new MongoStore({ db: CarrierDatabase.getDB() } as any)
        }));


        app.use(passport.initialize());
        app.use(passport.session());

        passport.serializeUser(UserUtils.serialiseUser);
        passport.deserializeUser(UserUtils.deserialiseUser);

        app.use(RequestValidationHelper.bounceNotLoggedIn);
        
        app.route('/whoAmI')
            .get(UserControllerBasic.whoAmI);
        
        app.all('/', function(err: Error, req: Request, res: Response, next: NextFunction) {
            res.status(500).json(new CustomError('Server error.'));
        })

        return app;
    }
}