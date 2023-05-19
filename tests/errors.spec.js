
const request = require('supertest');
const express = require('express');
const errors = require('../dist/errors'); 

let app;

beforeEach(() => {
  app = express();
  errors(app);
});

// Then you can write your tests as before:

describe('App', () => {
  it('should respond with OpenAPI.yaml content for /OpenAPI.yaml', async () => {
    const res = await request(app).get('/OpenAPI.yaml');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toEqual('text/yaml');
  });

  it('should respond with security.txt for /.well-known/security.txt', async () => {
    const res = await request(app).get('/.well-known/security.txt');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toEqual('text/plain');
  });

  it('should respond with a 404 status for a POST request to an unknown route', async () => {
    const res = await request(app).post('/unknown');
    expect(res.statusCode).toEqual(404);
  });

  it('should respond with a 404 status for a GET request to an unknown route', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toEqual(404);
  });

  it('should respond with a 405 status for a PUT request to an unknown route', async () => {
    const res = await request(app).put('/unknown');
    expect(res.statusCode).toEqual(405);
  });

  it('should respond with a 405 status for a DELETE request to an unknown route', async () => {
    const res = await request(app).delete('/unknown');
    expect(res.statusCode).toEqual(405);
  });

  it('should respond with a 405 status for a PATCH request to an unknown route', async () => {
    const res = await request(app).patch('/unknown');
    expect(res.statusCode).toEqual(405);
  });

  it('should respond with a 405 status for a PROPFIND request to an unknown route', async () => {
    const res = await request(app).propfind('/unknown');
    expect(res.statusCode).toEqual(405);
  });

  it('should respond with options for a OPTIONS request', async () => {
    const res = await request(app).options('/');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      GET: {
        paths: ['/v0/ingredients/:ingredientslist', 'v0/peta/crueltyfree']
      },
      POST: {
        paths: '/v0/product/:barcode'
      }
    });
  });
});
