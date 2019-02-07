const childProcess = require("child_process");

describe("My mainframe automated test", () => {

    it("should submit a job and check the output", () => {
        const output =
            childProcess.execSync("bright zos-jobs submit data-set \"hlq.public.cntl(iefbr14)\"" +
                " --vasc --response-format-json");
        const jsonResponse = JSON.parse(output);

        expect(jsonResponse.stdout).toContain("IEFBR14");
        expect(jsonResponse.stdout).toContain("RC=0000");
    });

});