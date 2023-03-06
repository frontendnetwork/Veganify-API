<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/221289921-b5437f01-7b5c-415a-afd5-d49b926a9217.svg" alt="VeganCheck API logo" width="128">

# VeganCheck.me API (v0.2.0)

The official API powering [VeganCheck.me](https://github.com/jokenetwork/vegancheck.me).
  
<br />

<img src="https://user-images.githubusercontent.com/4144601/221717632-0d8ac44f-4eb0-43ef-906a-bc31e0021055.png" alt="">

</div>

## Documentation 

Please refer to [VeganCheck.me API Documentation](https://jokenetwork.de/vegancheck-api) for a full documentation.

To learn more about this repo, head to: [https://jokenetwork.github.io/VeganCheck.me-API/](https://jokenetwork.github.io/VeganCheck.me-API/).

### Swagger
[![Validate OpenAPI.yml](https://github.com/JokeNetwork/VeganCheck.me-API/actions/workflows/validate.yml/badge.svg)](https://github.com/JokeNetwork/VeganCheck.me-API/actions/workflows/validate.yml)

The [`OpenAPI.yml`](https://github.com/JokeNetwork/VeganCheck.me-API/blob/main/OpenAPI.yaml) can be imported into Swagger and is available here: [Swagger Editor](https://editor-next.swagger.io/?url=https://raw.githubusercontent.com/JokeNetwork/VeganCheck.me-API/main/OpenAPI.yaml)

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
