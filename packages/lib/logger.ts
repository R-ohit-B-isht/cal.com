import { Logger } from "tslog";

import { IS_PRODUCTION } from "./constants";

const getValidLogLevel = (level: string | undefined): number => {
  const parsedLevel = parseInt(level || "4");
  return parsedLevel >= 0 && parsedLevel <= 6 ? parsedLevel : 4;
};

const logger = new Logger({
  minLevel: getValidLogLevel(process.env.NEXT_PUBLIC_LOGGER_LEVEL),
  maskValuesOfKeys: ["password", "passwordConfirmation", "credentials", "credential"],
  prettyLogTimeZone: IS_PRODUCTION ? "UTC" : "local",
  prettyErrorStackTemplate: "  • {{fileName}}\t{{method}}\n\t{{filePathWithLine}}", // default
  prettyErrorTemplate: "\n{{errorName}} {{errorMessage}}\nerror stack:\n{{errorStack}}", // default
  prettyLogTemplate: "{{hh}}:{{MM}}:{{ss}}:{{ms}} [{{logLevelName}}] ", // default with exclusion of `{{filePathWithLine}}`
  stylePrettyLogs: true,
  prettyLogStyles: {
    name: "yellow",
    dateIsoStr: "blue",
  },
});

export default logger;
