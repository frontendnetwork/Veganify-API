module.exports = function (app) {
    const express = require("express");
    const axios = require("axios");
    const cheerio = require("cheerio");
    const qs = require("qs");
    const fs = require("fs");
    const jsdom = require("jsdom");
    const { JSDOM } = jsdom;
    app.use(express.json());
    
    app.get("/v0/cron/peta", async (req, res) => {
    try {
    const html = await axios.get("https://crueltyfree.peta.org/companies-dont-test/");
    const $ = cheerio.load(html.data);
    const data = $("#cfcs-filter-js-extra").text();
    const security = data.slice(47, 57);
    const response = await axios({
        method: "post",
        url: "https://tierversuchsfrei.peta-approved.de/wp-admin/admin-ajax.php",
        data: qs.stringify({
          security,
          action: "dynamic_filtering",
          sort: "companies-dont-test",
          per_page: "all",
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "*/*",
        },
      });
      
      const jsonRes = response.data;
      const ul = jsonRes.html;
      const petali = ul /*.replace(/<li>/g, "");*/;
      const peta = petali.replace(/[\n|\t]/g, "");
      
      const dom = new JSDOM(peta);
        const array = [];
        const liElements = dom.window.document.getElementsByTagName("li");
        for (let i = 0; i < liElements.length; i++) {
            array.push(liElements[i].textContent);
        }
      
      const output = {
        LAST_UPDATE: new Date().toLocaleString() + " CET",
        ENTRIES: `${liElements.length}`,
        PETA_DOES_NOT_TEST: [],
      };
      
      array.forEach((entry) => {
        if (entry.endsWith("FL")) {
          if(entry.slice(0,-2))
            output.PETA_DOES_NOT_TEST.push(entry.slice(0,-2));
        } else if (entry.endsWith("L")) {
          if(entry.slice(0,-1))
            output.PETA_DOES_NOT_TEST.push(entry.slice(0,-1));
        } else if (entry.endsWith("F")) {
          if(entry.slice(0,-1))
            output.PETA_DOES_NOT_TEST.push(entry.slice(0,-1));
        } else {
          output.PETA_DOES_NOT_TEST.push(entry);
        }
      });
      
      fs.writeFileSync(
        "./peta_cruelty_free.json",
        JSON.stringify(output, null, 2) + "\n"
      );
      
      res.status(200).json(output);
    } catch (err) {
        res.status(500).json({ message: err.message });
        }
    }); 
};
