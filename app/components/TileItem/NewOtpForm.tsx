// @ts-nocheck

import { useState, useEffect, useRef } from "react";
import { useOtpIdentityById } from "~/utils/frontend/hooks/OtpIdentity";
import { Box, Typography, Button, TextField } from "@mui/material";
import { useActionDialogs } from "~/utils/frontend/hooks/ActionDialogs";
import { OtpIdentity } from "~/utils/backend/OtpIdentityDAO";
import { useCreateOtpIdentity } from "~/utils/frontend/hooks/OtpIdentity";

import OtpCodeLabel from "~/components/TileItem/OtpCodeLabel";

function ScanQrCodeView() {
  const myDivRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    async function _load() {
      try {
        // //@ts-ignore
        const videoElement = myDivRef.current;

        if (videoElement) {
          // // Assign the camera stream to the video element
          // //@ts-ignore
          videoElement.srcObject = await navigator.mediaDevices.getUserMedia({
            video: true,
          });

          // const videoElement = document.getElementById('camera');
          // const stream = await navigator.mediaDevices.getUserMedia({ video: true });

          // // Assign the camera stream to the video element
          // videoElement.srcObject = stream;

          // scanner
          let scanner = new Instascan.Scanner({ video: videoElement });

          scanner.addListener("scan", function (content) {
            console.log(">> code scan", content);
            document.querySelector(
              "#test"
            ).innerText = `scan content: ${content}`;
          });
          Instascan.Camera.getCameras()
            .then(function (cameras) {
              setCameras(cameras);

              if (cameras.length > 0) {
                scanner.start(cameras[idx]);
              } else {
                console.error("No cameras found.");
                document.querySelector(
                  "#test"
                ).innerText = `no camera found: ${content}`;
              }
            })
            .catch(function (e) {
              console.error(e);
              document.querySelector("#test").innerText = `scan error: ${e}`;
            });
        }
      } catch (e1) {
        document.querySelector("#test").innerText = `init error: ${e1}`;
      }
    }
    _load();
  }, [myDivRef, idx]);

  return (
    <Box>
      <video id="camera" ref={myDivRef} autoPlay></video>
      <Box id="test"></Box>
      <Box>Cam Idx: {idx}</Box>
      <Box sx={{ display: "flex", gap: 2 }}>
        {cameras.map((cam, camIdx) => (
          <Button onClick={() => setIdx(camIdx)}>
            {camIdx} - {JSON.stringify(cam.id || cam)}
          </Button>
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
        <Button
          onClick={() => {
            modal({
              showCloseButton: true,
              size: "md",
              title: `New OTP`,
              message: <ScanQrCodeView />,
            });
          }}
        >
          Scan QR Code
        </Button>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "end" }}>
          <Button type="submit" variant="contained" disabled={isSaving}>
            Save
          </Button>
          <Button onClick={() => dismiss()} disabled={isSaving}>
            Cancel
          </Button>
        </Box>
      </Box>
    </form>
  );
}
