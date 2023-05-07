<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/221289921-b5437f01-7b5c-415a-afd5-d49b926a9217.svg" alt="VeganCheck API logo" width="128">

# VeganCheck.me API (v0.2.0)

The official API powering [VeganCheck.me](https://github.com/frontendnetwork/vegancheck.me).

<br />

![postman_dark](https://user-images.githubusercontent.com/4144601/232414583-466b133f-ef98-457b-a478-88f53e2e91cd.png#gh-dark-mode-only)
![postman_light](https://user-images.githubusercontent.com/4144601/232414600-76809abb-9ace-4801-8787-e116526da4e1.png#gh-light-mode-only)
</div>

## Documentation 

Please refer to [VeganCheck.me API Documentation](https://jokenetwork.de/vegancheck-api) for a full documentation.

To learn more about this repo, head to: [https://frontendnetwork.github.io/VeganCheck.me-API/](https://frontendnetwork.github.io/VeganCheck.me-API/).

There is an official [Wrapper for React available on npm](https://www.npmjs.com/package/@frontendnetwork/vegancheck).

### Swagger
[![Validate OpenAPI.yml](https://github.com/frontendnetwork/VeganCheck.me-API/actions/workflows/validate.yml/badge.svg)](https://github.com/JokeNetwork/VeganCheck.me-API/actions/workflows/validate.yml)

The [`OpenAPI.yml`](https://github.com/frontendnetwork/VeganCheck.me-API/blob/main/OpenAPI.yaml) can be imported into Swagger and is available here: [Swagger Editor](https://editor-next.swagger.io/?url=https://raw.githubusercontent.com/frontendnetwork/VeganCheck.me-API/main/OpenAPI.yaml)

### Postman

Postman Collection is available for download here: [VeganCheck API.postman_collection.json.zip](https://github.com/frontendnetwork/VeganCheck.me-API/files/11247406/VeganCheck.API.postman_collection.json.zip)

### API Endpoints

> **Warning** <br />
> All endpoints are only accessible via HTTPS. All HTTP requests will be rerouted to HTTPS.<br /> 
> Making a request over HTTP may cause data to be transmitted unencrypted for a short time and the server to send a `301` code.
    
#### Available endpoints
The following endpoints are available within the VeganCheck.me API:
- POST: <https://api.vegancheck.me/v0/product/{barcode}>
- GET: <https://api.vegancheck.me/v0/ingredients/{ingredientslist}>
- GET: <https://api.vegancheck.me/v0/peta/crueltyfree>

#### Unavailable endpoints
The following endpoints are currently unavailable within the public VeganCheck.me API. They're not on the roadmap and will not be published:
- <del>GET: [https://api.vegancheck.me/v0/peta/veganapproved](https://api.vegancheck.me/v0/peta/veganapproved)</del>
- <del>POST: <https://api.vegancheck.me/v0/grades/backend></del>
