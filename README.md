<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/221289921-b5437f01-7b5c-415a-afd5-d49b926a9217.svg" alt="Veganify API logo" width="128">

# Veganify API (v0.5)

The official API powering [Veganify](https://github.com/frontendnetwork/veganify).

<br />

![postman_dark](https://user-images.githubusercontent.com/4144601/232414583-466b133f-ef98-457b-a478-88f53e2e91cd.png#gh-dark-mode-only)
![postman_light](https://user-images.githubusercontent.com/4144601/232414600-76809abb-9ace-4801-8787-e116526da4e1.png#gh-light-mode-only)

</div>

## Documentation

Please refer to [Veganify API Documentation](https://frontendnet.work/veganify-api) for a full documentation.

There is an official [Wrapper for React, Vue, Svelte, and more available on npm](https://www.npmjs.com/package/@frontendnetwork/veganify).

### Swagger

[![Validate OpenAPI.yml](https://github.com/frontendnetwork/veganify-API/actions/workflows/validate.yml/badge.svg)](https://github.com/frontendnetwork/Veganify-API/actions/workflows/validate.yml)

The [`OpenAPI.yml`](https://github.com/frontendnetwork/Veganify-API/blob/main/OpenAPI.yaml) is automatically available in [this Swagger UI](https://api.veganify.app/api-docs).

#### Available endpoints

The following endpoints are available within the Veganify API:

- POST: <https://api.veganify.app/v0/product/{barcode}>
- GET: <https://api.veganify.app/v0/ingredients/{ingredientslist}>
- GET: <https://api.veganify.app/v0/peta/crueltyfree>

## Development

To run the API locally, you first need to set up the environment variables. You can do this by creating a `.env` file based on the `.env.example` file.
Here, you need to set `DEEPL_AUTH` to a valid DeepL API key (you can get one [here](https://www.deepl.com/docs-api/) for free), `PUSHOVER_TOKEN` and `PUSHOVER_USER` can be left blank, and `USER_ID_OEANDB` to your OpenEANDB user key.
For Development purposes, you can just provide a dummy value for the `USER_ID_OEANDB` key.

After setting up the `.env` file, you can run the following commands to get everything up and running:

```bash
npm install
npm run start:dev
```

Before committing any changes, you need to make sure that your code passes the linter and the tests. Run `npm run lint` and `npm run test` to check if everything is ok.

### Updating the Vegan and Non-Vegan ingredient lists

Before committing changes to the `isnotvegan.json` and `isvegan.json` lists, format and process them by running the following command:

```bash
npm run process:vegan
npm run process:notvegan
```
