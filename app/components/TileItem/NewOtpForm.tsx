// @ts-nocheck

import { useState, useEffect, useRef } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useCreateOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";

import OtpCodeLabel from "~/components/TileItem/OtpCodeLabel";

function ScanQrCodeView(props: {
  onScan: (newTotp: string) => void
}) {
  const myDivRef = useRef(null);
  const {onScan} = props;
  const [cameras, setCameras] = useState([]);
  const [idx, setIdx] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let scanner;
    async function _load() {
      try {
        // //@ts-ignore
        const videoElement = myDivRef.current;
        setMessage('');

        if (videoElement) {
          // scanner
          if (cameras && cameras.length > 0){
            scanner = new Instascan.Scanner({ video: videoElement, mirror: false });

            scanner.addListener("scan", (content) => {
              const newTotp = content;

              if (newTotp.indexOf(`otpauth://totp/`) === 0){
                // trigger onScan if the content matches TOTP
                onScan(newTotp);
              }
            });
            scanner.start(cameras[idx]);
          } else {
            setMessage(`System doesn't have any camera`);
          }
        }
      } catch (e1) {
        setMessage(`Scanner init errors: ${e1}`);
      }
    }
    _load();

    return () => {
      if (scanner){
        scanner.stop();
      }
    }
  }, [myDivRef, idx, cameras]);

  useEffect(() => {
    // initiate camera
    Instascan.Camera.getCameras()
      .then(function (cameras) {
        setCameras(cameras);
      })
      .catch(function (e1) {
        setMessage(`Failed to get cameras: ${e1}`);
      });
  }, [])

  return (
    <Box>
      <video ref={myDivRef} autoPlay></video>
      <Box>{message}</Box>
      <Box>
        {cameras.map((cam, camIdx) => (
          <Box key={cam.id} sx={{mt: 2}}>
            <Button onClick={() => setIdx(camIdx)}>
              {camIdx} - {cam.name}
              {/*  - {JSON.stringify(cam.ID || cam)} */}
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function () {
  const { modal, dismiss } = useActionDialogs();
  const [name, setName] = useState("");
  const [totp, setTotp] = useState("");
  const { mutateAsync: createOtp, isLoading: isSaving } =
    useCreateOtpIdentity();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await createOtp({
            name,
            login: {
              totp,
            },
          });
          dismiss();
        } catch (err) {}
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Name"
          autoFocus
          required
        />
        <TextField
          value={totp}
          onChange={(e) => setTotp(e.target.value)}
          label="TOTP"
          required
        />
        <Box>{totp}</Box>
        <Box>
          <Button
            onClick={() => {
              modal({
                showCloseButton: true,
                size: "md",
                title: `New OTP`,
                message: <ScanQrCodeView onScan={(newTotp: string) => {
                  setTotp(newTotp);
                  alert(newTotp)
                  dismiss();
                }} />,
              });
            }}
          >
            Scan QR Code
          </Button>
        </Box>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
          <Button type="submit" variant="contained" disabled={isSaving}>
            Save
          </Button>
          <Button onClick={() => dismiss()} disabled={isSaving}>
            Cancel
          </Button>
        B</Box>
      </Box>
    </form>
  );
}
