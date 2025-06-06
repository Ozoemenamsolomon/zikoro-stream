import { ToasterProps } from "react-hot-toast";


export const TOASTER_PROPS: ToasterProps = {
	position: "top-right",
	toastOptions: {
		style: {
			fontSize: "0.875rem",
		},
		duration: 4000,
		success: {
			style: {
				backgroundColor: "#FFFFFF",
				color: "#13C02A",
			},
		},
	},
};

