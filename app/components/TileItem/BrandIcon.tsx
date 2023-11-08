import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCode } from "@fortawesome/free-solid-svg-icons";
import {
  faGoogle,
  faMicrosoft,
  faLinkedin,
  faGithub,
  faPaypal,
  faDropbox,
  faBitbucket,
  faFacebook,
  faNpm,
} from "@fortawesome/free-brands-svg-icons";
import {
  red,
  pink,
  purple,
  deepPurple,
  indigo,
  blue,
  lightBlue,
  cyan,
  teal,
  green,
  lightGreen,
  lime,
  yellow,
  amber,
  orange,
  deepOrange,
  brown,
  grey,
  blueGrey,
} from "@mui/material/colors";

type BrandIconProp = {
  icon: string;
};

const ICON_MAPPINGS = {
  Google: faGoogle,
  Microsoft: faMicrosoft,
  Linkedin: faLinkedin,
  Github: faGithub,
  Paypal: faPaypal,
  Dropbox: faDropbox,
  Bitbucket: faBitbucket,
  Facebook: faFacebook,
  Npm: faNpm,
};

const COLOR_MAPPINGS = {};
const COLOR_WHEELS = [
  red,
  pink,
  purple,
  deepPurple,
  indigo,
  blue,
  lightBlue,
  cyan,
  teal,
  green,
  lightGreen,
  lime,
  yellow,
  amber,
  orange,
  deepOrange,
  brown,
  grey,
  blueGrey,
];
let colorStrength = 500;
let colorIdx = 0;
for (const brandKey of Object.keys(ICON_MAPPINGS)) {
  //@ts-ignore
  COLOR_MAPPINGS[brandKey] = COLOR_WHEELS[colorIdx][colorStrength];

  colorIdx = (colorIdx + 1) % COLOR_WHEELS.length;
  if (colorStrength === 0) {
    colorStrength += 100;
    if (colorStrength > 900) {
      colorStrength = 100;
    }
  }
}

export default function BrandIcon(props: BrandIconProp) {
  const { icon } = props;

  let mappedIcon = faCode;
  let mappedColor = green["A100"]; // default color is green

  for (const brandKey of Object.keys(ICON_MAPPINGS)) {
    if (icon.match(new RegExp(brandKey, "i"))) {
      //@ts-ignore
      mappedIcon = ICON_MAPPINGS[brandKey];

      //@ts-ignore
      mappedColor = COLOR_MAPPINGS[brandKey];
      break;
    }
  }

  return <FontAwesomeIcon icon={mappedIcon} style={{ color: mappedColor }} />;
}
