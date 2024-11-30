import axios, { AxiosError } from "axios";
import { useState } from "react";

export default function App() {
  const [intercept, setIntercept] = useState(false);
  const [error, setError] = useState<string | undefined>("");
  const [tokenTimeoutTimer, setTokenTimeoutTimer] = useState<string | number>(
    ""
  );
  const [second, setSeconds] = useState<number>(0);

  const [loggedInUser, setLoggedInUser] = useState({
    firstName: "",
    lastName: "",
  });

  const [formData, setFormData] = useState({
    username: "emilys",
    password: "emilyspass",
    tokenTimeout: tokenTimeoutTimer,
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prevFormData) => ({ ...prevFormData, [name]: value }));
  };

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault();
    try {
      const { data } = await axios.post(
        "https://dummyjson.com/auth/login",
        {
          username: formData.username,
          password: formData.password,
          expiresInMins: tokenTimeoutTimer,
        },
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      localStorage.setItem("access_token", data?.accessToken);
      localStorage.setItem("refresh_token", data?.refreshToken);
      setError("");
      getCurrentUser();
    } catch (error) {
      const message = (error as AxiosError<{ message: string }>).response?.data
        ?.message;
      setError(message);
    }
    timer();
  };

  const getCurrentUser = async () => {
    try {
      const { data } = await axios.get("https://dummyjson.com/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      setLoggedInUser({
        firstName: data?.firstName,
        lastName: data?.lastName,
      });
    } catch (error) {
      const message = (error as AxiosError<{ message: string }>).response?.data
        ?.message;
      setError(message);
    }
  };

  const timer = () => {
    const stop = Number(tokenTimeoutTimer) * 60;
    setSeconds(stop);
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev == 0) {
          getCurrentUser();
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const refreshToken = async () => {
    try {
      const { data } = await axios.post(
        "https://dummyjson.com/auth/refresh",
        {
          refreshToken: localStorage.getItem("refresh_token"),
          expiresInMins: 30,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      return data.refreshToken;
    } catch (error) {
      console.error("Error refreshing token:", error);
    }
  };

  const activateInterceptor = () => {
    setIntercept(true);
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response && error.response.status === 401) {
          const newToken = await refreshToken();
          if (newToken) {
            axios.defaults.headers.common[
              "Authorization"
            ] = `Bearer ${newToken}`;
            error.config.headers["Authorization"] = `Bearer ${newToken}`;
            return axios(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  };

  return (
    <>
      <div className="flex gap-24">
        <form onSubmit={handleSubmit} className="flex flex-col w-[20rem]">
          <div>
            <div className="flex flex-col mb-4   gap-1">
              <label className="text-sm text-gray-500" htmlFor="username">
                Username
              </label>

              <input
                className="border p-2 rounded-md"
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            <div className="flex flex-col mb-6 gap-1">
              <label className="text-sm text-gray-500" htmlFor="password">
                Password
              </label>
              <input
                className="border p-2 rounded-md"
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col mb-6 gap-1">
              <label className="text-sm text-gray-500" htmlFor="tokenTimeout">
                Token Timeout (In mins)
              </label>
              <input
                className="border p-2 rounded-md"
                type="number"
                id="tokenTimeout"
                name="tokenTimeout"
                value={tokenTimeoutTimer}
                onChange={(e) => setTokenTimeoutTimer(Number(e.target.value))}
              />
            </div>
          </div>
          <button
            className="bg-gray-900 text-white py-2 rounded-md"
            type="submit"
          >
            Login
          </button>
        </form>

        <div className="flex flex-col justify-between">
          <div>
            <h1 className="mb-1 text-md underline">Token Status</h1>
            <p className="mb-6 text-gray-400 ">Token expires in: {second}s</p>

            <h2>
              {error || !loggedInUser.firstName ? (
                <>
                  <span className="text-red-600">{error}</span>
                </>
              ) : (
                <>
                  <span className="text-xs bg-green-500 mb-1 text-white p-1 px-2 rounded-full">
                    Active User
                  </span>
                  <h1 className=" text-lg font-medium">
                    {loggedInUser.firstName} {loggedInUser.lastName}
                  </h1>
                </>
              )}
            </h2>
          </div>
          <button
            className={` ${
              intercept ? "bg-green-600" : "bg-gray-400"
            } text-white focus:bg-green-600 py-2 px-6 rounded-md`}
            onClick={activateInterceptor}
          >
            Activate Interceptor
          </button>
        </div>
      </div>
    </>
  );
}
