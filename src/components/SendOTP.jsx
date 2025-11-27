import axios from "axios";
import { useState } from "react";

export default function SendOTP() {
  const [email, setEmail] = useState("");

  const sendOTP = async () => {
    await axios.post("${import.meta.env.VITE_API_URL}/auth/send-otp", { email });
    alert("OTP sent to your email!");
  };

  return (
    <div>
      <input
        type="email"
        placeholder="Enter email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <button onClick={sendOTP}>Send Code</button>
    </div>
  );
}
