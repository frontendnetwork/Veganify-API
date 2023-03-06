<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/221289921-b5437f01-7b5c-415a-afd5-d49b926a9217.svg" alt="VeganCheck API logo" width="128">

# VeganCheck.me API (v0.2.0)

The official API for [VeganCheck.me](https://github.com/jokenetwork/vegancheck.me).
  
<br />

<img src="https://user-images.githubusercontent.com/4144601/221717632-0d8ac44f-4eb0-43ef-906a-bc31e0021055.png" alt="">

</div>

## Documentation 

Please refer to [VeganCheck.me API Documentation](https://jokenetwork.de/vegancheck-api) for a full documentation.

To learn more about this repo, head to: [https://jokenetwork.github.io/VeganCheck.me-API/](https://jokenetwork.github.io/VeganCheck.me-API/).

### Swagger
[![Validate OpenAPI.yml](https://github.com/JokeNetwork/VeganCheck.me-API/actions/workflows/validate.yml/badge.svg)](https://github.com/JokeNetwork/VeganCheck.me-API/actions/workflows/validate.yml)

The [`OpenAPI.yml`](https://github.com/JokeNetwork/VeganCheck.me-API/blob/main/OpenAPI.yaml) can be imported into Swagger and is available here: [Swagger Editor](https://editor-next.swagger.io/?url=https://raw.githubusercontent.com/JokeNetwork/VeganCheck.me-API/main/OpenAPI.yaml)

## Endpoints

All endpoints are only accessible via HTTPS.
    
### Available endpoints
The following endpoints are available within the VeganCheck.me API:

- `https://api.vegancheck.me/v0/grades/backend`

   Warning: This endpoint is not publicly available in the repo and will not be published.
- `https://api.vegancheck.me/v0/ingredients/{ingredientslist}`
- `https://api.vegancheck.me/v0/peta/crueltyfree`
- `https://api.vegancheck.me/v0/product/{barcode}`

### Unavailable endpoints
The following endpoints are currently unavailable within the VeganCheck.me API:
- <del>`https://api.vegancheck.me/v0/peta/veganapproved`</del>
