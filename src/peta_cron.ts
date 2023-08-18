import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import axios from "axios";
import cheerio from "cheerio";
import qs from "qs";
import fs from "fs";
import jsdom from "jsdom";
const { JSDOM } = jsdom;

export default function (app: Application): void {
  app.use(express.json());

  function asyncMiddleware (fn: any) {
    return (req: Request, res: Response, next: any) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  app.get(
    "/v0/cron/peta",
    asyncMiddleware(async (req: Request, res: Response) => {
      try {
        const html = await axios.get(
          "https://crueltyfree.peta.org/companies-dont-test/"
        );
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
        const petali = ul;
        const peta = petali.replace(/[\n|\t]/g, "");

        const dom = new JSDOM(peta);
        const array: string[] = [];
        const liElements = dom.window.document.getElementsByTagName("li");
        for (let i = 0; i < liElements.length; i++) {
          if (liElements[i].textContent !== null) {
            array.push(liElements[i].textContent as string);
          }
        }

        const output = {
          LAST_UPDATE: new Date().toLocaleString() + " CET",
          ENTRIES: `${liElements.length}`,
          PETA_DOES_NOT_TEST: [] as string[],
        };

        array.forEach((entry: string) => {
          if (entry.endsWith("FL")) {
            if (entry.slice(0, -2)) {
              output.PETA_DOES_NOT_TEST.push(entry.slice(0, -2));
            }
          } else if (entry.endsWith("L")) {
            if (entry.slice(0, -1)) {
              output.PETA_DOES_NOT_TEST.push(entry.slice(0, -1));
            }
          } else if (entry.endsWith("F")) {
            if (entry.slice(0, -1)) {
              output.PETA_DOES_NOT_TEST.push(entry.slice(0, -1));
            }
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
        res.status(500).json({ message: (err as Error).message });
      }
    })
  );
}
