import { Box, Typography, Button, TextField } from "@mui/material";

export default function (props: any) {
  const { onChange, value } = props;
  return (
    <Box>
      <TextField
        value={value}
        onChange={onChange}
        label="TOTP"
        required
        fullWidth
      />
    </Box>
  );
}
