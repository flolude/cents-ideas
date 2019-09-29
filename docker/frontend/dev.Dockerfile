FROM node:10-alpine as buildContainer

WORKDIR /usr/app/src

COPY package.json .
COPY yarn.lock .
COPY ./packages ./packages
COPY ./services/frontend ./services/frontend

RUN yarn install

COPY ./tsconfig.settings.json ./
COPY ./docker/frontend/tsconfig.json ./

WORKDIR /usr/app/src/services/frontend
RUN yarn build:ssr

CMD yarn serve:ssr