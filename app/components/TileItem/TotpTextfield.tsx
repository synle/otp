import { Box, TextField } from "@mui/material";

/**
 * Required text input for the `otpauth://totp/...` URI. Thin wrapper around
 * MUI `<TextField>` used by both the create and edit forms so they stay in sync.
 */
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
